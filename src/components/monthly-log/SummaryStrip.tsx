"use client"

import { cn } from "@/lib/utils"
import { MonthlyHeader } from "./types"

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)

interface SummaryStripProps {
  header: MonthlyHeader | null
  totalExpenditure: number
}

export function SummaryStrip({ header, totalExpenditure }: SummaryStripProps) {
  const income = header ? Number(header.income) : null
  const emiTotal = header ? Number(header.emiTotal) : null
  const savings = header ? Number(header.savings) : null
  const netIncome = income !== null && emiTotal !== null && savings !== null
    ? income - emiTotal - savings
    : null
  const surplus = netIncome !== null ? netIncome - totalExpenditure : null

  const stats = [
    {
      label: "Income",
      value: income !== null ? formatINR(income) : "—",
      color: "text-gray-900",
    },
    {
      label: "EMI",
      value: emiTotal !== null ? formatINR(emiTotal) : "—",
      color: "text-gray-900",
    },
    {
      label: "Savings",
      value: savings !== null ? formatINR(savings) : "—",
      color: "text-gray-900",
    },
    {
      label: "Net Income",
      value: netIncome !== null ? formatINR(netIncome) : "—",
      color: "text-gray-900",
    },
    {
      label: "Spent",
      value: formatINR(totalExpenditure),
      color: "text-gray-900",
    },
    {
      label: "Surplus",
      value: surplus !== null ? formatINR(surplus) : "—",
      color: surplus === null ? "text-gray-400" : surplus >= 0 ? "text-emerald-600" : "text-red-600",
    },
  ]

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white border border-gray-200 rounded-xl px-3 py-3 text-center"
        >
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
            {stat.label}
          </p>
          <p className={cn("text-sm font-semibold", stat.color)}>{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
