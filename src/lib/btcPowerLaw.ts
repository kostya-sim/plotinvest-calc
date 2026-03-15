// Giovanni Santostasi power-law model
//
// Fair value (center):
//   model = A * t^B   where t = days since genesis
//
// Lower / support band:
//   lower = model * LOWER_MULT
//   The support ratio is roughly constant over time (~0.35×), so a fixed
//   multiplier is a good approximation.
//
// Upper / resistance band:
//   upper = model * upperRatio(t)
//   where upperRatio(t) = UPPER_K * t^UPPER_E  (a fitted power-law decay)
//   The resistance ratio shrinks as Bitcoin matures: early bull peaks were
//   ~17× fair value (2011), compressing to ~10× (2013) and ~3.5× (2026+).
//   A constant multiplier cannot capture this, so the upper line is its own
//   independent power-law: upper = 6.279e-14 * t^4.98636

export const BTC_GENESIS = new Date("2009-01-03T00:00:00Z");

// Fair-value line
const A = 1.435e-17;
const B = 5.8;

// Lower band: fixed multiplier (roughly constant support floor)
const LOWER_MULT = 0.3548;

// Upper band: time-decaying ratio fitted from historical cycle tops
//   upperRatio(t) = UPPER_K * t^UPPER_E
//   Equivalent direct form: upper = 6.279e-14 * t^4.98636
const UPPER_K = 4376.279944576468;
const UPPER_E = -0.8136391675513904;

export type ChartPoint = {
  date: string;
  timestamp: number;
  price?: number;
  model: number;
  upper: number;
  lower: number;
};

export function daysSinceGenesis(date: Date): number {
  const ms = date.getTime() - BTC_GENESIS.getTime();
  return Math.max(1, ms / 86_400_000);
}

function bands(t: number): { model: number; upper: number; lower: number } {
  const model = A * Math.pow(t, B);
  const upper = model * UPPER_K * Math.pow(t, UPPER_E);
  const lower = model * LOWER_MULT;
  return { model, upper, lower };
}

export function buildChartData(
  historicalPrices: Array<[number, number]>,
  horizonYears: number
): ChartPoint[] {
  const points: ChartPoint[] = [];
  const seen = new Set<string>();

  const now = new Date();
  const projectionEnd = new Date(now);
  projectionEnd.setFullYear(projectionEnd.getFullYear() + horizonYears);

  // Model grid: monthly steps through history, weekly into the future
  const cursor = new Date(BTC_GENESIS);
  while (cursor <= projectionEnd) {
    const dateStr = cursor.toISOString().slice(0, 10);
    const b = bands(daysSinceGenesis(cursor));
    points.push({ date: dateStr, timestamp: cursor.getTime(), ...b });
    seen.add(dateStr);
    cursor.setDate(cursor.getDate() + (cursor <= now ? 30 : 7));
  }

  // Merge historical daily prices
  for (const [ts, price] of historicalPrices) {
    const d = new Date(ts);
    const dateStr = d.toISOString().slice(0, 10);
    if (seen.has(dateStr)) {
      const pt = points.find((p) => p.date === dateStr);
      if (pt) pt.price = price;
    } else {
      const b = bands(daysSinceGenesis(d));
      points.push({ date: dateStr, timestamp: d.getTime(), price, ...b });
    }
  }

  points.sort((a, b) => a.timestamp - b.timestamp);
  return points;
}
