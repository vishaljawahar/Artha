"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { CheckSquare, CircleDollarSign, Landmark, LogOut, Moon, MoreHorizontal, Settings, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const MOBILE_NAV_ITEMS = [
  { href: "/dashboard",      label: "Home",     icon: "🏠" },
  { href: "/monthly-log",    label: "Monthly",  icon: "📅" },
  { href: "/annual-hub",     label: "Annual",   icon: "📆" },
  { href: "/wealth-tracker", label: "Wealth",   icon: "📈" },
]

const MORE_ITEMS = [
  { href: "/loans", label: "Loans", icon: Landmark },
  { href: "/passive-income", label: "Passive Income", icon: CircleDollarSign },
  { href: "/bill-checklist", label: "Bill Checklist", icon: CheckSquare },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const moreActive = MORE_ITEMS.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"))

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[60px]",
                isActive ? "text-emerald-600" : "text-muted-foreground"
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[60px] outline-none",
              moreActive ? "text-emerald-600" : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">More</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="mb-2 w-52">
            {MORE_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <DropdownMenuItem key={item.href} asChild>
                  <Link
                    href={item.href}
                    className={cn("flex items-center gap-2", isActive && "text-emerald-600")}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center gap-2"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
