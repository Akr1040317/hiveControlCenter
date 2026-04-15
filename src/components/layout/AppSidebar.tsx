import Link from "next/link";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/content-management", label: "Content Management" },
  { href: "/users", label: "Users & Access" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/bee-ready", label: "Bee Ready Ops" },
  { href: "/commerce", label: "Commerce" },
  { href: "/automation", label: "Automation" },
  { href: "/tools-center", label: "Tools Center" },
  { href: "/observability", label: "Observability" },
  { href: "/settings", label: "Settings" },
];

export function AppSidebar() {
  return (
    <aside className="w-full border-b border-[#1e1e34] bg-[#121220] px-4 py-4 md:w-64 md:border-b-0 md:border-r md:px-5">
      <div className="mb-5">
        <p className="hive-section-label">
          Hive Control Center
        </p>
        <p className="text-sm text-[#d8d8ea]">Admin mission control</p>
      </div>

      <nav className="flex flex-wrap gap-2 md:flex-col">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-[#d5d5e7] hover:bg-[rgba(255,165,0,0.12)] hover:text-[#ffd08a]"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
