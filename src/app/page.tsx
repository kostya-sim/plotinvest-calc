import Link from "next/link";

const tiles = [
  {
    href: "/stocks",
    title: "Stocks",
    description: "Future value calculator with inflation adjustment",
  },
  {
    href: "/crypto",
    title: "Crypto",
    description: "BTC Power Law chart and analysis",
  },
  {
    href: "/real-estate",
    title: "Real Estate",
    description: "Levered real estate return calculator",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl pt-12 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome to PlotInvest</h1>
          <p className="text-gray-600">
            Choose a calculator to get started
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {tiles.map(({ href, title, description }) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl border bg-white p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-gray-500">{description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
