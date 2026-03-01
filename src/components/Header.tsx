import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/stocks", label: "Stocks" },
  { href: "/crypto", label: "Crypto" },
  { href: "/real-estate", label: "Real Estate" },
];

export default function Header() {
  return (
    <header className="border-b bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          PlotInvest
        </Link>
        <ul className="flex gap-6 text-sm font-medium text-gray-600">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} className="hover:text-gray-900 transition-colors">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
