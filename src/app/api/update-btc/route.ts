export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  console.log("BTC updater triggered", new Date().toISOString());

  // ── 1. Fetch today's BTC price from CoinGecko ──────────────────────────
  const cgRes = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
    {
      headers: { "x-cg-pro-api-key": process.env.COINGECKO_API_KEY ?? "" },
      cache: "no-store",
    }
  );

  if (!cgRes.ok) {
    console.error("BTC updater error", { step: "coingecko_fetch", status: cgRes.status });
    return NextResponse.json(
      { success: false, error: `CoinGecko error: ${cgRes.status}` },
      { status: 502 }
    );
  }

  const cgData = await cgRes.json();
  const price: number = cgData?.bitcoin?.usd;
  if (!price) {
    console.error("BTC updater error", { step: "coingecko_parse", body: cgData });
    return NextResponse.json(
      { success: false, error: "Unexpected CoinGecko response shape" },
      { status: 502 }
    );
  }

  // ── 2. Format today's date ─────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  // ── 3. Check if today already exists in Supabase ──────────────────────
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("btc_price_daily")
    .select("date")
    .eq("date", today)
    .maybeSingle();

  if (selectError) {
    console.error("BTC updater error", { step: "supabase_select", error: selectError.message });
    return NextResponse.json(
      { success: false, error: selectError.message },
      { status: 500 }
    );
  }

  if (existing) {
    console.log("BTC price already exists for date", today);
    return NextResponse.json({ success: true, action: "already_exists", price });
  }

  // ── 4. Insert today's price ────────────────────────────────────────────
  const { error: insertError } = await supabaseAdmin
    .from("btc_price_daily")
    .insert({ date: today, close_price_usd: price });

  if (insertError) {
    console.error("BTC updater error", { step: "supabase_insert", error: insertError.message });
    return NextResponse.json(
      { success: false, error: insertError.message },
      { status: 500 }
    );
  }

  console.log("BTC price inserted", { date: today, price });
  return NextResponse.json({ success: true, action: "inserted", price });
}
