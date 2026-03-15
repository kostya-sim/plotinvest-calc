import { supabase } from "../../lib/supabaseClient";

export async function getBtcPrices() {
  const { data, error } = await supabase
    .from("btc_price_daily")
    .select("*")
    .order("date", { ascending: true });

  if (error) throw error;

  return data;
}

export async function getLatestBtcPrice() {
  const { data, error } = await supabase
    .from("btc_price_daily")
    .select("*")
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;

  return data;
}