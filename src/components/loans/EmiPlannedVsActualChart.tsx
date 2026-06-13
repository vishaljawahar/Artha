"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { Loan, formatINR } from "./types"

interface EmiPlannedVsActualChartProps {
  loan: Loan
}

interface MonthPoint {
  key: string
  label: string
  planned: number
  actual: number
}

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

function formatYAxis(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`
  return `₹${v}`
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-md px-3 py-2">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} className="text-sm font-medium text-foreground flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: p.color }} />
            {p.name}: {formatINR(p.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function EmiPlannedVsActualChart({ loan }: EmiPlannedVsActualChartProps) {
  const grouped = new Map<string, MonthPoint>()
  for (const e of loan.emiEntries) {
    const key = `${e.year}-${String(e.month).padStart(2, "0")}`
    const existing = grouped.get(key) ?? {
      key,
      label: `${MONTH_ABBR[e.month - 1]} ${String(e.year).slice(-2)}`,
      planned: 0,
      actual: 0,
    }
    existing.planned += Number(e.plannedShare)
    existing.actual += e.actualPaid != null ? Number(e.actualPaid) : 0
    grouped.set(key, existing)
  }

  const data = Array.from(grouped.values()).sort((a, b) => a.key.localeCompare(b.key))

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-4">EMI: Planned vs Actual</h3>
        <div className="flex items-center justify-center h-[180px]">
          <p className="text-muted-foreground text-sm text-center">
            No EMI entries yet
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-semibold text-foreground mb-4">EMI: Planned vs Actual</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--accent))", opacity: 0.4 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="planned" name="Planned" fill="#94a3b8" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="actual" name="Actual" fill="#10B981" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
