"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const MOBILE_NAV_ITEMS = [
  { href: "/dashboard",      label: "Home",     icon: "🏠" },
  { href: "/monthly-log",    label: "Monthly",  icon: "📅" },
  { href: "/annual-hub",     label: "Annual",   icon: "📆" },
  { href: "/passive-income", label: "Passive",  icon: "💰" },
  { href: "/wealth-tracker", label: "Wealth",   icon: "📈" },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[60px]",
                isActive ? "text-emerald-400" : "text-slate-500"
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
