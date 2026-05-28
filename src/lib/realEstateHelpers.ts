import {
  countries,
  markets,
  marketData,
  type Country,
  type Market,
  type MarketDataRow,
} from "./realEstateData";

/** Standardised floor area used for all 2BR calculations. */
export const SQMS_2BR = 85;

// ── Derived types ──────────────────────────────────────────────────────────────

export type DerivedMarketMetrics = {
  market_id: string;
  market_name: string;
  slug: string;
  country: Country;
  data_quality: Market["data_quality"];
  foreign_buyer_friction: Market["foreign_buyer_friction"];
  period_label: string;
  /** Average 2BR purchase price in USD */
  avg_price_usd: number;
  /** Typical monthly rent in USD */
  monthly_rent_usd: number;
  /** Annual gross yield (decimal, e.g. 0.057 = 5.7%) */
  gross_yield: number;
  /** avg_price_usd / SQMS_2BR */
  implied_price_per_sqm_usd: number;
  /** 5-year price growth in local currency (decimal). Null if insufficient history. */
  five_year_growth: number | null;
};

export type HistoricalPoint = {
  year: string;
  avg_price_usd: number;
  monthly_rent_usd: number;
  gross_yield: number;
};

// ── Lookups ────────────────────────────────────────────────────────────────────

function findCountry(country_id: string): Country {
  const c = countries.find((c) => c.country_id === country_id);
  if (!c) throw new Error(`Country not found: ${country_id}`);
  return c;
}

export function getActiveMarkets(): Market[] {
  return markets
    .filter((m) => m.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function getMarketBySlug(slug: string): Market | undefined {
  return markets.find((m) => m.slug === slug);
}

export function getHistoricalDataForMarket(market_id: string): MarketDataRow[] {
  return marketData
    .filter((d) => d.market_id === market_id)
    .sort((a, b) => a.period_start_date.localeCompare(b.period_start_date));
}

// ── Derived calculations ───────────────────────────────────────────────────────

function deriveMetrics(
  market: Market,
  latest: MarketDataRow,
  oldest: MarketDataRow | undefined
): DerivedMarketMetrics {
  const country = findCountry(market.country_id);

  const avg_price_usd = latest.avg_price_lcu / latest.fx_lcu_per_usd;
  const monthly_rent_usd = latest.monthly_rent_lcu / latest.fx_lcu_per_usd;
  // Gross yield computed in LCU to avoid FX noise
  const gross_yield = (latest.monthly_rent_lcu * 12) / latest.avg_price_lcu;
  const implied_price_per_sqm_usd = avg_price_usd / SQMS_2BR;

  // 5Y growth also in LCU for the same reason
  const five_year_growth =
    oldest && oldest.period_start_date <= "2020-06-30"
      ? (latest.avg_price_lcu - oldest.avg_price_lcu) / oldest.avg_price_lcu
      : null;

  return {
    market_id: market.market_id,
    market_name: market.market_name,
    slug: market.slug,
    country,
    data_quality: market.data_quality,
    foreign_buyer_friction: market.foreign_buyer_friction,
    period_label: latest.period_label,
    avg_price_usd,
    monthly_rent_usd,
    gross_yield,
    implied_price_per_sqm_usd,
    five_year_growth,
  };
}

/** Returns derived metrics for every active market (sorted by sort_order). */
export function getAllLatestMetrics(): DerivedMarketMetrics[] {
  return getActiveMarkets().map((market) => {
    const history = getHistoricalDataForMarket(market.market_id);
    return deriveMetrics(market, history[history.length - 1], history[0]);
  });
}

/** Returns derived metrics for a single market by slug. */
export function getMarketMetrics(slug: string): DerivedMarketMetrics | null {
  const market = getMarketBySlug(slug);
  if (!market) return null;
  const history = getHistoricalDataForMarket(market.market_id);
  if (!history.length) return null;
  return deriveMetrics(market, history[history.length - 1], history[0]);
}

/** Returns annual historical data points suitable for chart rendering. */
export function getMarketHistory(market_id: string): HistoricalPoint[] {
  return getHistoricalDataForMarket(market_id).map((d) => ({
    year: d.period_label,
    avg_price_usd: Math.round(d.avg_price_lcu / d.fx_lcu_per_usd),
    monthly_rent_usd: Math.round(d.monthly_rent_lcu / d.fx_lcu_per_usd),
    gross_yield: parseFloat(
      ((d.monthly_rent_lcu * 12) / d.avg_price_lcu * 100).toFixed(2)
    ),
  }));
}

/** How many units of this market's avg 2BR price fit into `investmentUSD`. */
export function calcBuyingPower(
  metrics: DerivedMarketMetrics,
  investmentUSD: number
): number {
  return investmentUSD / metrics.avg_price_usd;
}

// ── Formatters ─────────────────────────────────────────────────────────────────

/** Compact USD formatter: $1.03M, $820k, $620k */
export function fmtUSD(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

/** Full USD formatter with commas: $1,025,641 */
export function fmtUSDFull(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Percentage with sign, e.g. +58.3% or −13.0% */
export function fmtPct(value: number, decimals = 1): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(decimals)}%`;
}

/** Units purchasable, e.g. 1.93x */
export function fmtUnits(value: number): string {
  return `${value.toFixed(2)}x`;
}
