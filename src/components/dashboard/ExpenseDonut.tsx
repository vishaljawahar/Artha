"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"

interface CategoryItem {
  categoryId: string
  categoryName: string
  categoryColor: string | null
  total: number
}

interface ExpenseDonutProps {
  data: CategoryItem[]
  loading?: boolean
}

const DEFAULT_COLORS = [
  "#10B981", "#3B82F6", "#F59E0B", "#F43F5E", "#8B5CF6", "#06B6D4", "#EC4899", "#84CC16",
]

const INR = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v)

interface TooltipPayload {
  name: string
  value: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-md p-3 text-sm">
      <p className="font-semibold text-gray-800">{name}</p>
      <p className="text-gray-500 mt-0.5">{INR(value)}</p>
    </div>
  )
}

interface LegendEntry {
  color: string
  value: string
  payload: { value: number }
}

interface CustomLegendProps {
  payload?: LegendEntry[]
}

const renderCustomLegend = (props: CustomLegendProps) => {
  const { payload } = props
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
      {(payload ?? []).map((entry, i: number) => (
        <li key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span>{entry.value}</span>
          <span className="text-gray-400">({INR(entry.payload.value)})</span>
        </li>
      ))}
    </ul>
  )
}

export function ExpenseDonut({ data, loading }: ExpenseDonutProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-[260px] w-full" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center justify-center h-[320px]">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 self-start">Spending by Category</h3>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-3">
            <span className="text-2xl">🥧</span>
          </div>
          <p className="text-sm text-gray-400">No spending data yet</p>
        </div>
      </div>
    )
  }

  // Top 6 categories, rest grouped as "Other"
  const top6 = data.slice(0, 6)
  const otherTotal = data.slice(6).reduce((s, c) => s + c.total, 0)

  const chartData = [
    ...top6.map((c, i) => ({
      name: c.categoryName,
      value: c.total,
      color: c.categoryColor ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    })),
    ...(otherTotal > 0
      ? [{ name: "Other", value: otherTotal, color: "#D1D5DB" }]
      : []),
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Spending by Category</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={renderCustomLegend} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
