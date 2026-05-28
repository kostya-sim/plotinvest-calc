import Link from "next/link";

/**
 * Crypto section is temporarily parked while the Real Estate MVP is being built.
 * The original BTC Power Law chart code is preserved in BtcPowerLawChart.tsx
 * and will be restored once Supabase is wired back up.
 */
export default function CryptoPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 max-w-md w-full text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Crypto — Coming Soon</h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          The BTC Power Law chart is temporarily parked while the Real Estate MVP
          is being rebuilt. It will be back shortly.
        </p>
        <Link
          href="/real-estate"
          className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium
                     px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          ← Go to Real Estate
        </Link>
      </div>
    </div>
  );
}
