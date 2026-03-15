import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  // ── 1. Fetch today's BTC price from CoinGecko ──────────────────────────
  const cgRes = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
    {
      headers: { "x-cg-pro-api-key": process.env.COINGECKO_API_KEY ?? "" },
      cache: "no-store",
    }
  );

  if (!cgRes.ok) {
    return NextResponse.json(
      { success: false, error: `CoinGecko error: ${cgRes.status}` },
      { status: 502 }
    );
  }

  const cgData = await cgRes.json();
  const price: number = cgData?.bitcoin?.usd;
  if (!price) {
    return NextResponse.json(
      { success: false, error: "Unexpected CoinGecko response shape" },
      { status: 502 }
    );
  }

  // ── 2. Format today's date ─────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  // ── 3. Check if today already exists in Supabase ──────────────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: existing, error: selectError } = await supabase
    .from("btc_price_daily")
    .select("date")
    .eq("date", today)
    .maybeSingle();

  if (selectError) {
    return NextResponse.json(
      { success: false, error: selectError.message },
      { status: 500 }
    );
  }

  if (existing) {
    return NextResponse.json({ success: true, action: "already_exists", price });
  }

  // ── 4. Insert today's price ────────────────────────────────────────────
  const { error: insertError } = await supabase
    .from("btc_price_daily")
    .insert({ date: today, close_price_usd: price });

  if (insertError) {
    return NextResponse.json(
      { success: false, error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, action: "inserted", price });
}
