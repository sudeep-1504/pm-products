import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Backlogs" },
  { href: "/product-context", label: "Product Context" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b-2 border-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="font-mono text-sm font-semibold tracking-widest uppercase">
            Backlog Prioritisation
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 font-mono text-xs tracking-wider uppercase outline outline-2 outline-offset-[-2px] outline-transparent hover:outline-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
