import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
        {/* Logo */}
        <Link href="/real-estate" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold leading-none">P</span>
          </div>
          <span className="font-semibold text-slate-900">PlotInvest</span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <Link
            href="/real-estate"
            className="px-3 py-1.5 text-sm font-medium text-slate-600
                       hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            Real Estate
          </Link>
        </nav>
      </div>
    </header>
  );
}
