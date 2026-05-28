"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  getAllLatestMetrics,
  calcBuyingPower,
  fmtUSD,
  fmtPct,
  fmtUnits,
  type DerivedMarketMetrics,
} from "@/lib/realEstateHelpers";
import FlagIcon from "@/components/FlagIcon";

const INVESTMENT_OPTIONS = [250_000, 500_000, 1_000_000, 2_000_000, 5_000_000];
const PROPERTY_TYPE_LABEL = "2BR Apartment (~85 sqm)";

// ── Colour helpers ─────────────────────────────────────────────────────────────

function yieldColor(y: number) {
  if (y > 0.05) return "text-green-600";
  if (y > 0.035) return "text-amber-600";
  return "text-red-500";
}

function growthColor(g: number | null) {
  if (g === null) return "text-slate-500";
  return g >= 0 ? "text-green-600" : "text-red-500";
}

const FRICTION_BADGE: Record<
  DerivedMarketMetrics["foreign_buyer_friction"],
  { label: string; cls: string }
> = {
  low:        { label: "Easy access", cls: "bg-green-50 text-green-700 border-green-200" },
  medium:     { label: "Moderate",    cls: "bg-amber-50 text-amber-700 border-amber-200" },
  high:       { label: "Complex",     cls: "bg-red-50 text-red-700 border-red-200" },
  restricted: { label: "Restricted",  cls: "bg-purple-50 text-purple-700 border-purple-200" },
};

const QUALITY_BADGE: Record<DerivedMarketMetrics["data_quality"], string> = {
  high:   "bg-blue-50 text-blue-700",
  medium: "bg-amber-50 text-amber-700",
  low:    "bg-slate-100 text-slate-600",
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RealEstatePage() {
  const [investment, setInvestment] = useState(1_000_000);

  const allMetrics = useMemo(() => getAllLatestMetrics(), []);

  const ranked = useMemo(
    () =>
      [...allMetrics]
        .map((m) => ({ ...m, units: calcBuyingPower(m, investment) }))
        .sort((a, b) => b.units - a.units),
    [allMetrics, investment]
  );

  const maxUnits      = ranked[0]?.units ?? 1;
  const bestValue     = ranked[0];
  const bestYield     = [...allMetrics].sort((a, b) => b.gross_yield - a.gross_yield)[0];
  const mostExpensive = [...allMetrics].sort((a, b) => b.avg_price_usd - a.avg_price_usd)[0];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Global Real Estate Markets</h1>
          <p className="mt-1.5 text-slate-500">
            Compare how far your capital goes across global residential property markets.
          </p>
        </div>

        {/* Calculator + Takeaways */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">

          {/* Buying power card */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-6">
              <h2 className="text-base font-semibold text-slate-900">Buying Power</h2>
              <span className="text-xs text-slate-400">
                Units purchasable at today&apos;s avg asking price
              </span>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-4 mb-7">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Budget</label>
                <select
                  value={investment}
                  onChange={(e) => setInvestment(Number(e.target.value))}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-900
                             focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                >
                  {INVESTMENT_OPTIONS.map((v) => (
                    <option key={v} value={v}>USD {v.toLocaleString()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Property type</label>
                <div className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-500">
                  {PROPERTY_TYPE_LABEL}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Currency</label>
                <div className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-500">
                  USD
                </div>
              </div>
            </div>

            {/* Column headers */}
            <div className="flex items-center gap-3 mb-2 px-1">
              <div className="w-4" />
              <div className="w-6" />
              <div className="w-24 text-xs text-slate-400">Market</div>
              <div className="flex-1 text-xs text-slate-400 pl-1">Units available</div>
              <div className="w-20 text-right text-xs text-slate-400">Avg price</div>
              <div className="w-16 text-right text-xs text-slate-400">Yield</div>
            </div>

            {/* Ranked rows */}
            <div className="space-y-3">
              {ranked.map((m, i) => (
                <div key={m.market_id} className="flex items-center gap-3">
                  <span className="w-4 text-xs text-slate-400 text-right tabular-nums">{i + 1}</span>
                  <span className="w-6 flex items-center">
                    <FlagIcon iso2={m.country.iso2} countryName={m.country.country_name} />
                  </span>
                  <span className="w-24 text-sm font-medium text-slate-800 truncate">
                    {m.market_name}
                  </span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${(m.units / maxUnits) * 100}%` }}
                      />
                    </div>
                    <span className="w-11 text-sm font-semibold text-slate-800 tabular-nums">
                      {fmtUnits(m.units)}
                    </span>
                  </div>
                  <span className="w-20 text-right text-sm text-slate-500 tabular-nums">
                    {fmtUSD(m.avg_price_usd)}
                  </span>
                  <span className={`w-16 text-right text-sm font-medium tabular-nums ${yieldColor(m.gross_yield)}`}>
                    {(m.gross_yield * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Takeaways card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-indigo-500 text-lg">✦</span>
              <h2 className="text-base font-semibold text-slate-900">Key takeaways</h2>
            </div>
            <div className="space-y-5 flex-1">
              <Takeaway
                icon="🏆" bg="bg-green-50"
                label="Best buying power"
                value={bestValue ? `${bestValue.market_name} — ${fmtUnits(bestValue.units)}` : "—"}
              />
              <Takeaway
                icon="📈" bg="bg-blue-50"
                label="Highest rental yield"
                value={bestYield ? `${bestYield.market_name} — ${(bestYield.gross_yield * 100).toFixed(1)}% gross` : "—"}
              />
              <Takeaway
                icon="💰" bg="bg-purple-50"
                label="Most expensive market"
                value={mostExpensive ? `${mostExpensive.market_name} — ${fmtUSD(mostExpensive.avg_price_usd)} avg` : "—"}
              />
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 leading-relaxed">
                Gross yield = annual rent ÷ avg price. Data as of 2024.
                Sources: DLD, Land Registry, Zillow, TRREB, Centaline.
              </p>
            </div>
          </div>
        </div>

        {/* Market tiles */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Markets</h2>
          <span className="text-sm text-slate-400">{allMetrics.length} markets tracked</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {allMetrics.map((m) => (
            <MarketTile key={m.market_id} market={m} />
          ))}
        </div>

        <p className="mt-10 text-xs text-slate-400 text-center">
          All prices are indicative averages for mid-tier 2BR apartments (~85 sqm).
          This is for informational purposes only and does not constitute investment advice.
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Takeaway({
  icon, bg, label, value,
}: {
  icon: string; bg: string; label: string; value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`${bg} rounded-xl p-2.5 text-xl flex-shrink-0 leading-none`}>{icon}</div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-sm font-semibold text-slate-900 mt-0.5 leading-snug">{value}</div>
      </div>
    </div>
  );
}

function MarketTile({ market }: { market: DerivedMarketMetrics }) {
  const friction    = FRICTION_BADGE[market.foreign_buyer_friction];
  const qualityCls  = QUALITY_BADGE[market.data_quality];

  return (
    <Link
      href={`/real-estate/${market.slug}`}
      className="group block bg-white rounded-2xl border border-slate-200 shadow-sm
                 hover:shadow-md hover:border-indigo-300 transition-all duration-150 p-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="mb-2">
          <FlagIcon iso2={market.country.iso2} countryName={market.country.country_name} size="lg" />
        </div>
          <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
            {market.market_name}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{market.country.country_short_name}</div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${qualityCls}`}>
          {market.data_quality}
        </span>
      </div>

      {/* Metrics — NO calculator outputs here */}
      <div className="space-y-1.5 border-t border-slate-100 pt-3">
        <MetricRow label="Avg 2BR price" value={fmtUSD(market.avg_price_usd)} />
        <MetricRow label="Price / sqm"   value={fmtUSD(market.implied_price_per_sqm_usd)} />
        <MetricRow label="Monthly rent"  value={fmtUSD(market.monthly_rent_usd)} />
        <MetricRow
          label="Gross yield"
          value={`${(market.gross_yield * 100).toFixed(1)}%`}
          valueClass={yieldColor(market.gross_yield)}
        />
        <MetricRow
          label="5Y growth"
          value={market.five_year_growth !== null ? fmtPct(market.five_year_growth) : "—"}
          valueClass={growthColor(market.five_year_growth)}
        />
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${friction.cls}`}>
          {friction.label}
        </span>
        <span className="text-xs text-slate-400">as of {market.period_label}</span>
      </div>
      <div className="mt-2.5 text-xs font-medium text-indigo-600 group-hover:underline">
        View market →
      </div>
    </Link>
  );
}

function MetricRow({
  label, value, valueClass = "text-slate-800",
}: {
  label: string; value: string; valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-medium tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}
