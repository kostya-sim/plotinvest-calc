// ─────────────────────────────────────────────────────────────────────────────
// Real Estate dummy data
// Structured to mirror future Supabase tables.
// All prices are in local currency units (LCU); USD conversion via fx_lcu_per_usd.
// ─────────────────────────────────────────────────────────────────────────────

export type Country = {
  country_id: string;
  country_name: string;
  country_short_name: string;
  iso2: string;
  iso3: string;
  currency_code: string;
  region: string;
  flag_emoji: string;
};

export type Subdivision = {
  subdivision_id: string;
  country_id: string;
  subdivision_name: string;
  subdivision_type: string;
  subdivision_code: string;
};

export type Market = {
  market_id: string;
  market_name: string;
  country_id: string;
  subdivision_id: string | null;
  market_type: "city";
  slug: string;
  /** Confidence in the underlying data. */
  data_quality: "high" | "medium" | "low";
  /** Regulatory friction for foreign buyers. */
  foreign_buyer_friction: "low" | "medium" | "high" | "restricted";
  is_active: boolean;
  sort_order: number;
};

export type MarketDataRow = {
  market_id: string;
  period_type: "annual" | "quarterly";
  /** ISO date of the period start, e.g. "2024-01-01" */
  period_start_date: string;
  period_label: string;
  property_type_id: "2br_apartment";
  /** Average purchase price in local currency */
  avg_price_lcu: number;
  /** Typical monthly rent in local currency */
  monthly_rent_lcu: number;
  /** How many local currency units equal 1 USD */
  fx_lcu_per_usd: number;
  source_id: string;
};

// ── Countries ─────────────────────────────────────────────────────────────────

export const countries: Country[] = [
  {
    country_id: "ae",
    country_name: "United Arab Emirates",
    country_short_name: "UAE",
    iso2: "AE",
    iso3: "ARE",
    currency_code: "AED",
    region: "Middle East",
    flag_emoji: "🇦🇪",
  },
  {
    country_id: "gb",
    country_name: "United Kingdom",
    country_short_name: "UK",
    iso2: "GB",
    iso3: "GBR",
    currency_code: "GBP",
    region: "Europe",
    flag_emoji: "🇬🇧",
  },
  {
    country_id: "us",
    country_name: "United States",
    country_short_name: "USA",
    iso2: "US",
    iso3: "USA",
    currency_code: "USD",
    region: "North America",
    flag_emoji: "🇺🇸",
  },
  {
    country_id: "ca",
    country_name: "Canada",
    country_short_name: "Canada",
    iso2: "CA",
    iso3: "CAN",
    currency_code: "CAD",
    region: "North America",
    flag_emoji: "🇨🇦",
  },
  {
    country_id: "hk",
    country_name: "Hong Kong SAR",
    country_short_name: "Hong Kong",
    iso2: "HK",
    iso3: "HKG",
    currency_code: "HKD",
    region: "Asia Pacific",
    flag_emoji: "🇭🇰",
  },
];

// ── Subdivisions ──────────────────────────────────────────────────────────────

export const subdivisions: Subdivision[] = [
  {
    subdivision_id: "ae-dubai",
    country_id: "ae",
    subdivision_name: "Dubai",
    subdivision_type: "emirate",
    subdivision_code: "AE-DU",
  },
  {
    subdivision_id: "us-fl",
    country_id: "us",
    subdivision_name: "Florida",
    subdivision_type: "state",
    subdivision_code: "US-FL",
  },
  {
    subdivision_id: "ca-on",
    country_id: "ca",
    subdivision_name: "Ontario",
    subdivision_type: "province",
    subdivision_code: "CA-ON",
  },
];

// ── Markets ───────────────────────────────────────────────────────────────────

export const markets: Market[] = [
  {
    market_id: "dubai",
    market_name: "Dubai",
    country_id: "ae",
    subdivision_id: "ae-dubai",
    market_type: "city",
    slug: "dubai",
    data_quality: "high",
    foreign_buyer_friction: "low",
    is_active: true,
    sort_order: 1,
  },
  {
    market_id: "london",
    market_name: "London",
    country_id: "gb",
    subdivision_id: null,
    market_type: "city",
    slug: "london",
    data_quality: "high",
    foreign_buyer_friction: "medium",
    is_active: true,
    sort_order: 2,
  },
  {
    market_id: "miami",
    market_name: "Miami",
    country_id: "us",
    subdivision_id: "us-fl",
    market_type: "city",
    slug: "miami",
    data_quality: "high",
    foreign_buyer_friction: "low",
    is_active: true,
    sort_order: 3,
  },
  {
    market_id: "toronto",
    market_name: "Toronto",
    country_id: "ca",
    subdivision_id: "ca-on",
    market_type: "city",
    slug: "toronto",
    data_quality: "high",
    foreign_buyer_friction: "medium",
    is_active: true,
    sort_order: 4,
  },
  {
    market_id: "hong-kong",
    market_name: "Hong Kong",
    country_id: "hk",
    subdivision_id: null,
    market_type: "city",
    slug: "hong-kong",
    data_quality: "high",
    foreign_buyer_friction: "high",
    is_active: true,
    sort_order: 5,
  },
];

// ── Market Data (annual, 2BR ~85 sqm) ─────────────────────────────────────────
// Sources: DLD (Dubai), UK Land Registry (London), Zillow (Miami),
//          TRREB (Toronto), Centaline (Hong Kong). FX rates approximate year-avg.

export const marketData: MarketDataRow[] = [
  // ── Dubai (AED) ────────────────────────────────────────────────────────────
  { market_id: "dubai", period_type: "annual", period_start_date: "2020-01-01", period_label: "2020", property_type_id: "2br_apartment", avg_price_lcu: 1_200_000, monthly_rent_lcu: 7_500,  fx_lcu_per_usd: 3.67, source_id: "dld" },
  { market_id: "dubai", period_type: "annual", period_start_date: "2021-01-01", period_label: "2021", property_type_id: "2br_apartment", avg_price_lcu: 1_350_000, monthly_rent_lcu: 7_800,  fx_lcu_per_usd: 3.67, source_id: "dld" },
  { market_id: "dubai", period_type: "annual", period_start_date: "2022-01-01", period_label: "2022", property_type_id: "2br_apartment", avg_price_lcu: 1_550_000, monthly_rent_lcu: 8_200,  fx_lcu_per_usd: 3.67, source_id: "dld" },
  { market_id: "dubai", period_type: "annual", period_start_date: "2023-01-01", period_label: "2023", property_type_id: "2br_apartment", avg_price_lcu: 1_750_000, monthly_rent_lcu: 8_700,  fx_lcu_per_usd: 3.67, source_id: "dld" },
  { market_id: "dubai", period_type: "annual", period_start_date: "2024-01-01", period_label: "2024", property_type_id: "2br_apartment", avg_price_lcu: 1_900_000, monthly_rent_lcu: 9_000,  fx_lcu_per_usd: 3.67, source_id: "dld" },

  // ── London (GBP) ───────────────────────────────────────────────────────────
  { market_id: "london", period_type: "annual", period_start_date: "2020-01-01", period_label: "2020", property_type_id: "2br_apartment", avg_price_lcu: 540_000, monthly_rent_lcu: 2_100, fx_lcu_per_usd: 0.79, source_id: "land_registry" },
  { market_id: "london", period_type: "annual", period_start_date: "2021-01-01", period_label: "2021", property_type_id: "2br_apartment", avg_price_lcu: 570_000, monthly_rent_lcu: 2_200, fx_lcu_per_usd: 0.73, source_id: "land_registry" },
  { market_id: "london", period_type: "annual", period_start_date: "2022-01-01", period_label: "2022", property_type_id: "2br_apartment", avg_price_lcu: 620_000, monthly_rent_lcu: 2_350, fx_lcu_per_usd: 0.83, source_id: "land_registry" },
  { market_id: "london", period_type: "annual", period_start_date: "2023-01-01", period_label: "2023", property_type_id: "2br_apartment", avg_price_lcu: 630_000, monthly_rent_lcu: 2_480, fx_lcu_per_usd: 0.80, source_id: "land_registry" },
  { market_id: "london", period_type: "annual", period_start_date: "2024-01-01", period_label: "2024", property_type_id: "2br_apartment", avg_price_lcu: 650_000, monthly_rent_lcu: 2_600, fx_lcu_per_usd: 0.79, source_id: "land_registry" },

  // ── Miami (USD, fx = 1) ────────────────────────────────────────────────────
  { market_id: "miami", period_type: "annual", period_start_date: "2020-01-01", period_label: "2020", property_type_id: "2br_apartment", avg_price_lcu: 380_000, monthly_rent_lcu: 2_500, fx_lcu_per_usd: 1, source_id: "zillow" },
  { market_id: "miami", period_type: "annual", period_start_date: "2021-01-01", period_label: "2021", property_type_id: "2br_apartment", avg_price_lcu: 460_000, monthly_rent_lcu: 2_800, fx_lcu_per_usd: 1, source_id: "zillow" },
  { market_id: "miami", period_type: "annual", period_start_date: "2022-01-01", period_label: "2022", property_type_id: "2br_apartment", avg_price_lcu: 560_000, monthly_rent_lcu: 3_200, fx_lcu_per_usd: 1, source_id: "zillow" },
  { market_id: "miami", period_type: "annual", period_start_date: "2023-01-01", period_label: "2023", property_type_id: "2br_apartment", avg_price_lcu: 600_000, monthly_rent_lcu: 3_350, fx_lcu_per_usd: 1, source_id: "zillow" },
  { market_id: "miami", period_type: "annual", period_start_date: "2024-01-01", period_label: "2024", property_type_id: "2br_apartment", avg_price_lcu: 620_000, monthly_rent_lcu: 3_400, fx_lcu_per_usd: 1, source_id: "zillow" },

  // ── Toronto (CAD) ──────────────────────────────────────────────────────────
  { market_id: "toronto", period_type: "annual", period_start_date: "2020-01-01", period_label: "2020", property_type_id: "2br_apartment", avg_price_lcu: 750_000, monthly_rent_lcu: 2_200, fx_lcu_per_usd: 1.34, source_id: "trreb" },
  { market_id: "toronto", period_type: "annual", period_start_date: "2021-01-01", period_label: "2021", property_type_id: "2br_apartment", avg_price_lcu: 870_000, monthly_rent_lcu: 2_400, fx_lcu_per_usd: 1.25, source_id: "trreb" },
  { market_id: "toronto", period_type: "annual", period_start_date: "2022-01-01", period_label: "2022", property_type_id: "2br_apartment", avg_price_lcu: 980_000, monthly_rent_lcu: 2_600, fx_lcu_per_usd: 1.30, source_id: "trreb" },
  { market_id: "toronto", period_type: "annual", period_start_date: "2023-01-01", period_label: "2023", property_type_id: "2br_apartment", avg_price_lcu: 890_000, monthly_rent_lcu: 2_750, fx_lcu_per_usd: 1.35, source_id: "trreb" },
  { market_id: "toronto", period_type: "annual", period_start_date: "2024-01-01", period_label: "2024", property_type_id: "2br_apartment", avg_price_lcu: 900_000, monthly_rent_lcu: 2_800, fx_lcu_per_usd: 1.36, source_id: "trreb" },

  // ── Hong Kong (HKD) ────────────────────────────────────────────────────────
  { market_id: "hong-kong", period_type: "annual", period_start_date: "2020-01-01", period_label: "2020", property_type_id: "2br_apartment", avg_price_lcu: 9_200_000, monthly_rent_lcu: 27_000, fx_lcu_per_usd: 7.77, source_id: "centaline" },
  { market_id: "hong-kong", period_type: "annual", period_start_date: "2021-01-01", period_label: "2021", property_type_id: "2br_apartment", avg_price_lcu: 9_500_000, monthly_rent_lcu: 26_500, fx_lcu_per_usd: 7.77, source_id: "centaline" },
  { market_id: "hong-kong", period_type: "annual", period_start_date: "2022-01-01", period_label: "2022", property_type_id: "2br_apartment", avg_price_lcu: 8_800_000, monthly_rent_lcu: 26_000, fx_lcu_per_usd: 7.80, source_id: "centaline" },
  { market_id: "hong-kong", period_type: "annual", period_start_date: "2023-01-01", period_label: "2023", property_type_id: "2br_apartment", avg_price_lcu: 8_200_000, monthly_rent_lcu: 25_500, fx_lcu_per_usd: 7.82, source_id: "centaline" },
  { market_id: "hong-kong", period_type: "annual", period_start_date: "2024-01-01", period_label: "2024", property_type_id: "2br_apartment", avg_price_lcu: 8_000_000, monthly_rent_lcu: 25_000, fx_lcu_per_usd: 7.80, source_id: "centaline" },
];
