"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { buildChartData, ChartPoint } from "@/lib/btcPowerLaw";
import { supabase } from "../../../lib/supabaseClient";

// ─── layout constants (must match the main chart margins exactly) ─────────
const Y_AXIS_W   = 70;
const RIGHT_M    = 20;
const HORIZON    = 15; // generate model data through ~2040

// Navigator coordinate bounds — fixed regardless of data range
const NAV_MIN_TS = new Date("2011-01-01").getTime();
const NAV_MAX_TS = new Date("2040-01-01").getTime();

// ─── helpers ──────────────────────────────────────────────────────────────
function formatPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  if (v >= 1)         return `$${v.toFixed(0)}`;
  return `$${v.toFixed(2)}`;
}
function fmtMonthYear(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ─── quick-range definitions ──────────────────────────────────────────────
// Each button shows <years> back AND <years> forward from the latest BTC date.
const RANGES = [
  { label: "1Y",  years: 1  },
  { label: "3Y",  years: 3  },
  { label: "5Y",  years: 5  },
  { label: "10Y", years: 10 },
] as const;

// ─── Navigator ────────────────────────────────────────────────────────────
//
// A fully-custom SVG overlay on top of a mini Recharts price chart.
// Recharts Brush was replaced here because it does not reliably update
// when startIndex / endIndex props change programmatically (it stores its
// own internal state and ignores prop changes after mount).
//
// This component owns the interaction completely:
//   • drag left handle  → resize left edge
//   • drag right handle → resize right edge
//   • drag body         → pan the window
//   • click outside     → start a new selection
//
// The overlay SVG is absolutely positioned on top of the Recharts chart
// using the same Y_AXIS_W / RIGHT_M constants so pixel positions match.

const NAV_H      = 60;
const HANDLE_HIT = 10; // px hit-zone around each handle

type DragKind  = "left" | "right" | "body" | "new";
interface Drag { kind: DragKind; x0: number; ts0: [number, number] }

// ─── Custom tooltip ───────────────────────────────────────────────────────
// Recharts' built-in formatter renders items in chart-declaration order and
// can produce duplicates when Areas share dataKeys with Lines.  This component
// deduplicates, enforces the desired order, and fills in the latest known
// BTC price for future-date hovers.
function CustomTooltip({
  active, payload, label, latestPrice, latestPriceTs,
}: {
  active?:        boolean;
  payload?:       ReadonlyArray<{ dataKey: string; value: number }>;
  label?:         number | string;
  latestPrice?:   number;
  latestPriceTs?: number;
}) {
  if (!active || !payload?.length || label == null) return null;

  // De-duplicate: keep only the first occurrence of each dataKey
  const byKey: Record<string, number> = {};
  for (const item of payload) {
    if (!(item.dataKey in byKey) && typeof item.value === "number") {
      byKey[item.dataKey] = item.value;
    }
  }

  const isFuture = latestPriceTs != null && (label as number) > latestPriceTs;
  const btcPrice = isFuture ? latestPrice : byKey["price"];

  const rows: { key: string; name: string; value: number | undefined; note?: string }[] = [
    { key: "price", name: "Bitcoin Price", value: btcPrice, note: isFuture ? "(latest)" : undefined },
    { key: "lower", name: "Floor Price",   value: byKey["lower"] },
    { key: "model", name: "Fair Value",    value: byKey["model"] },
    { key: "upper", name: "Ceiling Price", value: byKey["upper"] },
  ];

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", minWidth: 200 }}>
      <div style={{ marginBottom: 6, fontWeight: 600, color: "#374151" }}>
        {new Date(label as number).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </div>
      {rows.map(({ key, name, value, note }) =>
        value != null ? (
          <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: 24, marginBottom: 2 }}>
            <span style={{ color: "#6b7280" }}>{name}{note ? ` ${note}` : ""}</span>
            <span style={{ fontWeight: 600, color: "#111827" }}>{formatPrice(value)}</span>
          </div>
        ) : null
      )}
    </div>
  );
}

// ─── Navigator ────────────────────────────────────────────────────────────
// Performance design: the Navigator maintains its own local display state
// (dispStart / dispEnd) that updates on every pointermove — only the SVG
// overlay re-renders, not the parent.  onChange is called only on pointerUp,
// so visibleData recomputation and main-chart re-renders happen once per drag
// gesture, not once per mousemove frame.

function Navigator({
  data,
  startTs,
  endTs,
  onChange,
  navMinTs,
  navMaxTs,
}: {
  data:      ChartPoint[];
  startTs:   number;
  endTs:     number;
  onChange:  (s: number, e: number) => void;
  navMinTs:  number;
  navMaxTs:  number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  const drag = useRef<Drag | null>(null);
  const [cursor, setCursor] = useState("default");

  // Local display state: updated on every pointermove (only Navigator re-renders)
  const [dispStart, setDispStart] = useState(startTs);
  const [dispEnd,   setDispEnd]   = useState(endTs);
  // Ref always holds the latest display values so onPointerUp can read them
  const dispRef = useRef({ start: startTs, end: endTs });

  // Sync local display state when props change (quick-range button clicks)
  useEffect(() => {
    if (!drag.current) {
      dispRef.current = { start: startTs, end: endTs };
      setDispStart(startTs);
      setDispEnd(endTs);
    }
  }, [startTs, endTs]);

  // Keep track of actual pixel width so the overlay matches the chart
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const minTs = navMinTs;
  const maxTs = navMaxTs;
  const dw    = Math.max(1, w - Y_AXIS_W - RIGHT_M);

  // Filter mini chart data to the nav window so pre-2011 data is excluded
  const navData = useMemo(
    () => data.filter((p) => p.timestamp >= navMinTs),
    [data, navMinTs]
  );

  const tsToX = (ts: number) =>
    Y_AXIS_W + ((ts - minTs) / (maxTs - minTs)) * dw;
  const xToTs = (x: number) => {
    const t = minTs + ((x - Y_AXIS_W) / dw) * (maxTs - minTs);
    return Math.max(minTs, Math.min(maxTs, t));
  };

  // SVG positions come from LOCAL state (fast), not from props
  const selL = tsToX(dispStart);
  const selR = tsToX(dispEnd);

  function relX(e: React.PointerEvent<SVGSVGElement>) {
    return e.clientX - e.currentTarget.getBoundingClientRect().left;
  }

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const x = relX(e);
    let kind: DragKind;
    if      (Math.abs(x - selL) <= HANDLE_HIT) kind = "left";
    else if (Math.abs(x - selR) <= HANDLE_HIT) kind = "right";
    else if (x > selL && x < selR)             kind = "body";
    else                                        kind = "new";
    // Snapshot the display values at drag start
    drag.current = { kind, x0: x, ts0: [dispRef.current.start, dispRef.current.end] };
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const x = relX(e);

    if (!drag.current) {
      if      (Math.abs(x - selL) <= HANDLE_HIT || Math.abs(x - selR) <= HANDLE_HIT) setCursor("ew-resize");
      else if (x > selL && x < selR)  setCursor("grab");
      else                            setCursor("crosshair");
      return;
    }

    const { kind, x0, ts0 } = drag.current;
    const dtPerPx = (maxTs - minTs) / dw;
    const dt      = (x - x0) * dtPerPx;
    const MIN_SEL = 7 * 86_400_000;

    let ns = dispRef.current.start;
    let ne = dispRef.current.end;

    if (kind === "left") {
      ns = Math.max(minTs, Math.min(ts0[0] + dt, ts0[1] - MIN_SEL));
    } else if (kind === "right") {
      ne = Math.min(maxTs, Math.max(ts0[1] + dt, ts0[0] + MIN_SEL));
    } else if (kind === "body") {
      const dur = ts0[1] - ts0[0];
      let s = ts0[0] + dt, en = ts0[1] + dt;
      if (s  < minTs) { s  = minTs;  en = minTs + dur; }
      if (en > maxTs) { en = maxTs;  s  = maxTs - dur; }
      ns = s; ne = en;
    } else {
      const a = xToTs(x0), b = xToTs(x);
      ns = Math.min(a, b); ne = Math.max(a, b);
    }

    // Update local state only — parent does NOT re-render on each frame
    dispRef.current = { start: ns, end: ne };
    setDispStart(ns);
    setDispEnd(ne);
  }

  function onPointerUp() {
    if (drag.current) {
      // Commit final position to parent once, triggering visibleData + main chart update
      onChange(dispRef.current.start, dispRef.current.end);
    }
    drag.current = null;
  }

  // Year-tick positions along the bottom of the navigator
  const yearTicks = useMemo(() => {
    const ticks: { x: number; label: string }[] = [];
    const start = new Date(minTs);
    const end   = new Date(maxTs);
    for (let y = start.getFullYear() + 1; y <= end.getFullYear(); y += 2) {
      const ts = new Date(y, 0, 1).getTime();
      if (ts >= minTs && ts <= maxTs) ticks.push({ x: tsToX(ts), label: String(y) });
    }
    return ticks;
  }, [minTs, maxTs, dw, w]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mini price area drawn in pure SVG — same tsToX coordinate system as the overlay,
  // so the price line always lands at the exact right date position.
  const miniPricePaths = useMemo(() => {
    // Collect price points within nav bounds, thinned to ≤1 pt per 2px for perf
    const raw = navData.filter((p) => p.price != null && p.timestamp <= navMaxTs);
    if (raw.length < 2) return null;
    const pts: typeof raw = [];
    let lastX = -Infinity;
    for (const p of raw) {
      const x = tsToX(p.timestamp);
      if (x - lastX >= 2) { pts.push(p); lastX = x; }
    }
    if (pts.length < 2) return null;
    const pMax = Math.max(...pts.map((p) => p.price!));
    if (pMax <= 0) return null;
    // Linear y-scale: price 0 → NAV_H (bottom), pMax → 0 (top)
    const toY = (v: number) => (NAV_H * (1 - v / pMax)).toFixed(1);
    let lineD = `M${tsToX(pts[0].timestamp).toFixed(1)},${toY(pts[0].price!)}`;
    for (let i = 1; i < pts.length; i++) {
      lineD += ` L${tsToX(pts[i].timestamp).toFixed(1)},${toY(pts[i].price!)}`;
    }
    const areaD =
      `${lineD}` +
      ` L${tsToX(pts[pts.length - 1].timestamp).toFixed(1)},${NAV_H}` +
      ` L${tsToX(pts[0].timestamp).toFixed(1)},${NAV_H} Z`;
    return { lineD, areaD };
  }, [navData, navMaxTs, dw]); // eslint-disable-line react-hooks/exhaustive-deps

  const TICK_H = 12;

  return (
    <div ref={wrapRef} className="select-none" style={{ height: NAV_H + TICK_H }}>
      {/* Single SVG: mini price chart + interactive overlay share the same coordinate space */}
      <svg
        width={w}
        height={NAV_H + TICK_H}
        style={{ cursor, display: "block" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Mini price area — drawn before overlay so dimming sits on top */}
        {miniPricePaths && (
          <>
            <path d={miniPricePaths.areaD} fill="#ede9fe" fillOpacity={0.7} stroke="none" />
            <path d={miniPricePaths.lineD} fill="none" stroke="#7c3aed" strokeWidth={1} />
          </>
        )}

        {/* Dimmed unselected areas */}
        <rect
          x={Y_AXIS_W}
          y={0}
          width={Math.max(0, selL - Y_AXIS_W)}
          height={NAV_H}
          fill="rgba(0,0,0,0.25)"
        />
        <rect
          x={selR}
          y={0}
          width={Math.max(0, w - RIGHT_M - selR)}
          height={NAV_H}
          fill="rgba(0,0,0,0.25)"
        />

        {/* Selection border */}
        <rect
          x={selL}
          y={0}
          width={Math.max(0, selR - selL)}
          height={NAV_H}
          fill="none"
          stroke="#7c3aed"
          strokeWidth={1.5}
        />

        {/* Left handle */}
        <rect x={selL - 3} y={8} width={6} height={NAV_H - 16} rx={3} fill="#7c3aed" />
        {/* Right handle */}
        <rect x={selR - 3} y={8} width={6} height={NAV_H - 16} rx={3} fill="#7c3aed" />

        {/* Year tick labels below the navigator */}
        {yearTicks.map(({ x, label }) => (
          <text
            key={label}
            x={x}
            y={NAV_H + TICK_H - 1}
            textAnchor="middle"
            fontSize={10}
            fill="#9ca3af"
            style={{ pointerEvents: "none" }}
          >{label}</text>
        ))}
      </svg>
    </div>
  );
}

// ─── data cache ────────────────────────────────────────────────────────────
let cachedPrices: Array<[number, number]> | null = null;

// ─── page ─────────────────────────────────────────────────────────────────
export default function CryptoPage() {
  const [logScale,    setLogScale]    = useState(true);
  const [showBands,   setShowBands]   = useState(true);
  const [activeRange, setActiveRange] = useState<string | null>("ALL");

  // Timestamps for the selected window; null = full data range
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [rangeEnd,   setRangeEnd]   = useState<number | null>(null);

  const [rawPrices,  setRawPrices]   = useState<Array<[number, number]>>([]);
  const [loading,    setLoading]     = useState(true);
  const [fetchError, setFetchError]  = useState<string | null>(null);

  // ── fetch ──────────────────────────────────────────────────────────────
  async function fetchPrices() {
    if (cachedPrices) { setRawPrices(cachedPrices); setLoading(false); return; }
    setLoading(true); setFetchError(null);
    try {
      const PAGE = 1000;
      let rows: { date: string; close_price_usd: number }[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("btc_price_daily")
          .select("date, close_price_usd")
          .order("date", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw new Error(error.message);
        if (!data || !data.length) break;
        rows = rows.concat(data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      const formatted: Array<[number, number]> = rows.map((r) => [
        new Date(r.date).getTime(), Number(r.close_price_usd),
      ]);
      cachedPrices = formatted;
      setRawPrices(formatted);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { fetchPrices(); }, []);

  // ── chart data ─────────────────────────────────────────────────────────
  const chartData = useMemo(() => buildChartData(rawPrices, HORIZON), [rawPrices]);

  const allMinTs = chartData[0]?.timestamp ?? 0;
  const allMaxTs = chartData[chartData.length - 1]?.timestamp ?? Date.now();

  // Resolve null → full extent
  const startTs: number = rangeStart ?? allMinTs;
  const endTs:   number = rangeEnd   ?? allMaxTs;

  // Slice chartData to the selected window.
  // Recharts ignores the XAxis `domain` prop for actual line/area clipping when
  // scale="time" — it only repositions tick labels. Filtering the data is the
  // only reliable way to make the main chart zoom to the navigator selection.
  // We include one point outside each edge so lines don't clip abruptly.
  const visibleData = useMemo(() => {
    if (!chartData.length) return chartData;
    let lo = chartData.findIndex((p) => p.timestamp >= startTs);
    if (lo === -1) lo = chartData.length - 1;
    lo = Math.max(0, lo - 1);

    let hi = chartData.length - 1;
    for (let i = chartData.length - 1; i >= 0; i--) {
      if (chartData[i].timestamp <= endTs) { hi = i; break; }
    }
    hi = Math.min(chartData.length - 1, hi + 1);

    return chartData.slice(lo, hi + 1);
  }, [chartData, startTs, endTs]);

  // ── dynamic y-domain for main chart ────────────────────────────────────
  // anchor: floor price at the start of the window, ceiling price at the end
  const yDomain = useMemo((): [number, number] => {
    if (!visibleData.length) return [0.01, 1_000_000];
    const first = visibleData[0];
    const last  = visibleData[visibleData.length - 1];
    const yMin  = first.lower;
    const yMax  = last.upper;
    const PAD   = 0.15;
    if (logScale) {
      // buffer in log space: multiply/divide by a constant ratio
      const ratio = Math.pow(yMax / yMin, PAD);
      return [Math.max(1e-4, yMin / ratio), yMax * ratio];
    } else {
      const span = yMax - yMin;
      return [Math.max(0, yMin - span * PAD), yMax + span * PAD];
    }
  }, [visibleData, logScale]);

  // ── range handlers ─────────────────────────────────────────────────────
  function handleNavigatorChange(s: number, e: number) {
    setRangeStart(s);
    setRangeEnd(e);
    setActiveRange(null); // clear quick-range highlight on manual drag
  }

  // Latest historical price point (last ChartPoint that has a real BTC price)
  const latestHistorical = useMemo(() => {
    for (let i = chartData.length - 1; i >= 0; i--) {
      if (chartData[i].price != null) {
        return { ts: chartData[i].timestamp, price: chartData[i].price! };
      }
    }
    return null;
  }, [chartData]);

  // Initialize default view once latestHistorical is available
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!latestHistorical || hasInitialized.current) return;
    hasInitialized.current = true;
    setRangeStart(NAV_MIN_TS);
    setRangeEnd(Math.min(NAV_MAX_TS, latestHistorical.ts + 5 * 365.25 * 86_400_000));
  }, [latestHistorical]);

  function applyRangeButton(btn: typeof RANGES[number]) {
    if (!latestHistorical) return;
    setActiveRange(btn.label);
    // Only change future end; preserve current historical start
    setRangeEnd(Math.min(NAV_MAX_TS, latestHistorical.ts + btn.years * 365.25 * 86_400_000));
  }

  const isReady = !loading && !fetchError && chartData.length > 0;

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-6xl pt-6">
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">

          {/* ── Header: title + controls + range buttons ─────────────── */}
          <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4 flex-wrap">

            {/* Left: title + scale/bands controls */}
            <div className="flex flex-col gap-2">
              <h1 className="text-xl font-bold text-gray-900">Bitcoin Power Law</h1>

              <div className="flex items-center gap-4 flex-wrap">
                {/* Scale toggle */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400 mr-0.5">Scale:</span>
                  {(["Linear", "Log"] as const).map((label) => (
                    <button
                      key={label}
                      onClick={() => setLogScale(label === "Log")}
                      className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${
                        logScale === (label === "Log")
                          ? "bg-gray-800 text-white"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                    >{label}</button>
                  ))}
                </div>

                {/* Bands toggle */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400 mr-0.5">Bands:</span>
                  {(["On", "Off"] as const).map((label) => (
                    <button
                      key={label}
                      onClick={() => setShowBands(label === "On")}
                      className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${
                        showBands === (label === "On")
                          ? "bg-gray-800 text-white"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                    >{label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: quick-range buttons */}
            <div className="flex items-center gap-0.5 self-end pb-0.5">
              {RANGES.map((btn) => (
                <button
                  key={btn.label}
                  onClick={() => applyRangeButton(btn)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    activeRange === btn.label
                      ? "bg-violet-600 text-white"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >{btn.label}</button>
              ))}
            </div>
          </div>

          {/* ── Main chart ───────────────────────────────────────────── */}
          <div className="px-2">
            {loading ? (
              <div className="flex h-96 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
              </div>
            ) : fetchError ? (
              <div className="flex h-96 flex-col items-center justify-center gap-3">
                <p className="text-red-600 text-sm">{fetchError}</p>
                <button
                  className="rounded-md bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-700"
                  onClick={fetchPrices}
                >Retry</button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={420}>
                <ComposedChart data={visibleData} margin={{ top: 10, right: RIGHT_M, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />

                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    scale="time"
                    domain={[startTs, endTs]}
                    tickFormatter={fmtMonthYear}
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    scale={logScale ? "log" : "linear"}
                    domain={yDomain}
                    tickFormatter={formatPrice}
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    allowDataOverflow
                    width={Y_AXIS_W}
                  />

                  <Tooltip
                    content={(props) => (
                      <CustomTooltip
                        {...props}
                        latestPrice={latestHistorical?.price}
                        latestPriceTs={latestHistorical?.ts}
                      />
                    )}
                  />

                  {/* Band fills: red zone above model, green zone below model */}
                  {showBands && <Area type="monotone" dataKey="upper" stroke="none" fill="#fca5a5" fillOpacity={0.35} isAnimationActive={false} legendType="none" />}
                  {showBands && <Area type="monotone" dataKey="model" stroke="none" fill="#ffffff" fillOpacity={1}    isAnimationActive={false} legendType="none" />}
                  {showBands && <Area type="monotone" dataKey="model" stroke="none" fill="#6ee7b7" fillOpacity={0.35} isAnimationActive={false} legendType="none" />}
                  {showBands && <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff" fillOpacity={1}    isAnimationActive={false} legendType="none" />}

                  {/* Band lines */}
                  {showBands && <Line type="monotone" dataKey="upper" stroke="#ef4444" strokeWidth={1.5} dot={false} isAnimationActive={false} name="upper" />}
                  {showBands && <Line type="monotone" dataKey="lower" stroke="#10b981" strokeWidth={1.5} dot={false} isAnimationActive={false} name="lower" />}

                  {/* Fair value center */}
                  <Line type="monotone" dataKey="model" stroke="#60a5fa" strokeWidth={2}   dot={false} isAnimationActive={false} name="model" />
                  {/* BTC price */}
                  <Line type="monotone" dataKey="price" stroke="#7c3aed" strokeWidth={1.5} dot={false} connectNulls={false} isAnimationActive={false} name="price" />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Legend + Navigator (only when data is ready) ─────────── */}
          {isReady && (
            <>
              {/* Legend */}
              <div className="px-6 py-3 flex items-center justify-center gap-8 border-t border-gray-100">
                {[
                  { color: "#7c3aed", label: "Bitcoin Price (USD)" },
                  { color: "#60a5fa", label: "Power Law Model"     },
                  { color: "#ef4444", label: "Ceiling Price"       },
                  { color: "#10b981", label: "Floor Price"         },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <svg width="20" height="3"><rect width="20" height="3" rx="1.5" fill={color} /></svg>
                    <span className="text-xs text-gray-500">{label}</span>
                  </div>
                ))}
              </div>

              {/* Navigator */}
              <div className="px-2 pb-5">
                <Navigator
                  data={chartData}
                  startTs={startTs}
                  endTs={endTs}
                  onChange={handleNavigatorChange}
                  navMinTs={NAV_MIN_TS}
                  navMaxTs={NAV_MAX_TS}
                />
              </div>
            </>
          )}

        </div>
      </div>
    </main>
  );
}
