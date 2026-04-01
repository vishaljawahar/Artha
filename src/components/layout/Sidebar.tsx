"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/dashboard",      label: "Dashboard",      icon: "🏠" },
  { href: "/monthly-log",    label: "Monthly Log",    icon: "📅" },
  { href: "/annual-hub",     label: "Annual Hub",     icon: "📆" },
  { href: "/passive-income", label: "Passive Income", icon: "💰" },
  { href: "/wealth-tracker", label: "Wealth Tracker", icon: "📈" },
  { href: "/settings",       label: "Settings",       icon: "⚙️"  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-slate-900 border-r border-slate-800 px-3 py-6">
      <div className="px-3 mb-8">
        <h1 className="text-2xl font-bold text-white">Artha</h1>
        <p className="text-xs text-slate-500 mt-0.5">Personal Finance</p>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-600/20 text-emerald-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors mt-4"
      >
        <span className="text-base">🚪</span>
        Sign out
      </button>
    </aside>
  )
}
