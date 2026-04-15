import Link from "next/link";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/users", label: "Users & Access" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/bee-ready", label: "Bee Ready Ops" },
  { href: "/commerce", label: "Commerce" },
  { href: "/automation", label: "Automation" },
  { href: "/observability", label: "Observability" },
  { href: "/settings", label: "Settings" },
];

export function AppSidebar() {
  return (
    <aside className="w-full border-b border-zinc-200 bg-white px-4 py-4 md:w-64 md:border-b-0 md:border-r md:px-5">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Hive Control Center
        </p>
        <p className="text-sm text-zinc-700">Admin mission control</p>
      </div>

      <nav className="flex flex-wrap gap-2 md:flex-col">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-amber-50 hover:text-amber-800"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
