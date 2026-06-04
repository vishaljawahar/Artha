"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useTheme } from "next-themes"
import { Sun, Moon, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/dashboard",      label: "Dashboard",      icon: "🏠" },
  { href: "/monthly-log",    label: "Monthly Log",    icon: "📅" },
  { href: "/annual-hub",     label: "Annual Hub",     icon: "📆" },
  { href: "/passive-income", label: "Passive Income", icon: "💰" },
  { href: "/wealth-tracker", label: "Wealth Tracker", icon: "📈" },
  { href: "/bill-checklist", label: "Bill Checklist", icon: "✅" },
  { href: "/settings",       label: "Settings",       icon: "⚙️"  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-card border-r border-border px-3 py-6">
      <div className="px-3 mb-8">
        <h1 className="text-2xl font-bold text-foreground">Artha</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Personal Finance</p>
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
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="space-y-1 mt-4">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
