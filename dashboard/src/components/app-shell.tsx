"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Boxes,
  FileText,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Package,
  RotateCcw,
  Search,
  Settings,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { company } from "@/lib/company";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/suppliers", label: "Suppliers", icon: Warehouse },
  { href: "/purchase-orders", label: "Purchase orders", icon: Package },
  { href: "/stock", label: "Stock", icon: Boxes },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/returns", label: "Returns / RMA", icon: RotateCcw },
  { href: "/shipments", label: "Shipments", icon: Truck },
  { href: "/search", label: "Search", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings },
];

const PRIMARY_HREFS = ["/", "/stock", "/invoices", "/customers"];
const primaryNav = PRIMARY_HREFS.map((href) => nav.find((item) => item.href === href)!);
const moreNav = nav.filter((item) => !PRIMARY_HREFS.includes(item.href));

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

export function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => setMoreOpen(false), [pathname]);
  const moreActive = moreNav.some((item) => pathname.startsWith(item.href));
  const initials = userName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <aside className="no-print hidden w-[290px] shrink-0 flex-col border-r border-gray-200 bg-white lg:flex dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
            {company.shortName[0]}
          </div>
          <div>
            <div className="text-theme-sm font-bold text-gray-800 dark:text-white/90">
              {company.shortName}
            </div>
            <div className="text-theme-xs text-gray-500 dark:text-gray-400">
              Wholesale Ops
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 pb-4">
          <h3 className="mb-3 px-3 text-theme-xs font-medium uppercase tracking-wider text-gray-400">
            Menu
          </h3>
          <ul className="flex flex-col gap-1">
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-theme-sm font-medium transition-colors",
                      active
                        ? "bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.03]",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        active
                          ? "text-brand-500 dark:text-brand-400"
                          : "text-gray-500 dark:text-gray-400",
                      )}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex items-center gap-3 border-t border-gray-200 p-4 dark:border-gray-800">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-theme-xs font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300">
            {initials || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {userName}
            </div>
            <div className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
              {company.tradingName}
            </div>
          </div>
          <ThemeToggle className="shrink-0 border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 lg:px-6 lg:py-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="shrink-0 font-bold text-gray-800 lg:hidden dark:text-white/90">
            {company.shortName} Ops
          </div>
          <form action="/search" className="min-w-0 flex-1 sm:max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
              <input
                name="q"
                placeholder="Search IMEI, invoice, PO, customer, tracking…"
                className="h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-11 pr-4 text-theme-sm text-gray-800 shadow-theme-xs outline-hidden transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>
          </form>
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle className="border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]" />
            <span className="hidden text-theme-sm text-gray-700 sm:inline dark:text-gray-400">
              {userName}
            </span>
            <div className="hidden h-6 w-px bg-gray-200 sm:block dark:bg-gray-800" />
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Sign out"
                className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-theme-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-4 pb-24 md:p-6 lg:pb-6">{children}</main>
      </div>

      <nav className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden dark:border-gray-800 dark:bg-gray-900">
        {primaryNav.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-theme-xs font-medium",
                active
                  ? "text-brand-500 dark:text-brand-400"
                  : "text-gray-500 dark:text-gray-400",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-2.5 text-theme-xs font-medium",
            moreActive
              ? "text-brand-500 dark:text-brand-400"
              : "text-gray-500 dark:text-gray-400",
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          More
        </button>
      </nav>

      {moreOpen ? (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-gray-900/50"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-gray-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
            <ul className="flex flex-col gap-1">
              {moreNav.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-theme-sm font-medium",
                        active
                          ? "bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400"
                          : "text-gray-700 dark:text-gray-300",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5",
                          active
                            ? "text-brand-500 dark:text-brand-400"
                            : "text-gray-500 dark:text-gray-400",
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
