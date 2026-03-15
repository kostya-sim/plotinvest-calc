import { createClient } from "@supabase/supabase-js";
import { buildChartData } from "@/lib/btcPowerLaw";
import BtcPowerLawChart from "./BtcPowerLawChart";

// Revalidate the cached page every 12 hours — BTC prices update once per day
export const revalidate = 43200;

const HORIZON = 15; // years of model projection

async function fetchBtcPrices(): Promise<Array<[number, number]>> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const PAGE = 1000;
  const rows: { date: string; close_price_usd: number }[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("btc_price_daily")
      .select("date, close_price_usd")
      .order("date", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Supabase fetch failed: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return rows.map((r) => [new Date(r.date).getTime(), Number(r.close_price_usd)]);
}

export default async function CryptoPage() {
  const rawPrices = await fetchBtcPrices();
  const chartData = buildChartData(rawPrices, HORIZON);
  return <BtcPowerLawChart chartData={chartData} />;
}
