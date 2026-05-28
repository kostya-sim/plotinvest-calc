"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  getMarketMetrics,
  getMarketHistory,
  getMarketBySlug,
  fmtUSD,
  fmtPct,
  type DerivedMarketMetrics,
  type HistoricalPoint,
} from "@/lib/realEstateHelpers";
import FlagIcon from "@/components/FlagIcon";

// ── Source labels per market ───────────────────────────────────────────────────

const SOURCES: Record<string, string> = {
  "dubai":     "Dubai Land Department (DLD), Property Monitor",
  "london":    "UK Land Registry, Rightmove, Zoopla",
  "miami":     "Zillow Research, NAR, Miami Association of Realtors",
  "toronto":   "Toronto Regional Real Estate Board (TRREB)",
  "hong-kong": "Centaline Property Agency, HKMA, Rating and Valuation Dept",
};

// ── Colour helpers (shared with dashboard) ────────────────────────────────────

function yieldColor(y: number) {
  if (y > 0.05) return "text-green-600";
  if (y > 0.035) return "text-amber-600";
  return "text-red-500";
}

function growthColor(g: number | null) {
  if (g === null) return "text-slate-800";
  return g >= 0 ? "text-green-600" : "text-red-500";
}

const FRICTION_LABEL: Record<DerivedMarketMetrics["foreign_buyer_friction"], string> = {
  low:        "Easy access for foreign buyers",
  medium:     "Moderate friction for foreign buyers",
  high:       "Complex process for foreign buyers",
  restricted: "Foreign buyer purchases restricted",
};

const FRICTION_CLS: Record<DerivedMarketMetrics["foreign_buyer_friction"], string> = {
  low:        "bg-green-50 text-green-700 border-green-200",
  medium:     "bg-amber-50 text-amber-700 border-amber-200",
  high:       "bg-red-50 text-red-700 border-red-200",
  restricted: "bg-purple-50 text-purple-700 border-purple-200",
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MarketDetailPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : (params.slug ?? "");

  const market  = getMarketBySlug(slug);
  const metrics = getMarketMetrics(slug);

  if (!market || !metrics) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🏙️</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Market not found</h1>
          <p className="text-slate-500 text-sm mb-6">
            &ldquo;{slug}&rdquo; doesn&apos;t match any tracked market.
          </p>
          <Link href="/real-estate" className="text-indigo-600 hover:underline text-sm">
            ← Back to markets
          </Link>
        </div>
      </div>
    );
  }

  const history = getMarketHistory(market.market_id);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Back link */}
        <Link
          href="/real-estate"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 mb-6 transition-colors"
        >
          ← Back to markets
        </Link>

        {/* Hero card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-5">
              <FlagIcon iso2={metrics.country.iso2} countryName={metrics.country.country_name} size="lg" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{metrics.market_name}</h1>
                <div className="text-slate-500 text-sm mt-0.5">{metrics.country.country_name}</div>
                <div className="text-xs text-slate-400 mt-1">Data as of {metrics.period_label}</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs px-3 py-1 rounded-full border font-medium ${FRICTION_CLS[metrics.foreign_buyer_friction]}`}
              >
                {FRICTION_LABEL[metrics.foreign_buyer_friction]}
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                {metrics.data_quality} data quality
              </span>
            </div>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <MetricCard label="Avg 2BR price"  value={fmtUSD(metrics.avg_price_usd)} />
          <MetricCard label="Price / sqm"    value={fmtUSD(metrics.implied_price_per_sqm_usd)} />
          <MetricCard label="Monthly rent"   value={fmtUSD(metrics.monthly_rent_usd)} />
          <MetricCard
            label="Gross yield"
            value={`${(metrics.gross_yield * 100).toFixed(1)}%`}
            valueClass={yieldColor(metrics.gross_yield)}
          />
          <MetricCard
            label="5Y price growth"
            value={metrics.five_year_growth !== null ? fmtPct(metrics.five_year_growth) : "—"}
            valueClass={growthColor(metrics.five_year_growth)}
          />
        </div>

        {/* Trend charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <TrendChart
            title="Avg 2BR Price (USD)"
            data={history}
            dataKey="avg_price_usd"
            color="#6366f1"
            formatter={fmtUSD}
          />
          <TrendChart
            title="Monthly Rent (USD)"
            data={history}
            dataKey="monthly_rent_usd"
            color="#22c55e"
            formatter={fmtUSD}
          />
          <TrendChart
            title="Gross Yield (%)"
            data={history}
            dataKey="gross_yield"
            color="#f59e0b"
            formatter={(v) => `${v}%`}
          />
        </div>

        {/* Methodology box */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📖</span>
            <h3 className="font-semibold text-slate-900">Methodology &amp; Sources</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-slate-600">
            <MethodRow label="Property type"  value="2BR apartment, standardised ~85 sqm" />
            <MethodRow label="Gross yield"    value="Annual gross rent ÷ avg asking price" />
            <MethodRow label="Price / sqm"    value="Avg 2BR price ÷ 85 sqm" />
            <MethodRow label="5Y growth"      value="Change in local-currency price 2020 → 2024" />
            <MethodRow label="Source"         value={SOURCES[slug] ?? "Various"} />
          </div>
          <p className="text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100">
            All prices are indicative averages. This is for informational purposes only
            and does not constitute investment advice.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MetricCard({
  label, value, valueClass = "text-slate-900",
}: {
  label: string; value: string; valueClass?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="text-xs text-slate-500 mb-1.5">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${valueClass}`}>{value}</div>
    </div>
  );
}

function MethodRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-slate-700 shrink-0">{label}:</span>
      <span className="text-slate-500">{value}</span>
    </div>
  );
}

function TrendChart({
  title,
  data,
  dataKey,
  color,
  formatter,
}: {
  title: string;
  data: HistoricalPoint[];
  dataKey: keyof HistoricalPoint;
  color: string;
  formatter: (v: number) => string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="text-sm font-semibold text-slate-800 mb-3">{title}</div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            formatter={(value) => [formatter(value as number), title]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 4px rgba(0,0,0,.06)",
            }}
            labelStyle={{ color: "#64748b", fontSize: 11 }}
          />
          <Line
            type="monotone"
            dataKey={dataKey as string}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
