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
  type TooltipProps,
} from "recharts"
import { type NameType, type ValueType } from "recharts/types/component/DefaultTooltipContent"
import { Skeleton } from "@/components/ui/skeleton"

interface MonthlySummaryItem {
  month: number
  monthName: string
  income: number
  emiTotal: number
  savings: number
  expenditure: number
}

interface MonthlyChartProps {
  data: MonthlySummaryItem[]
  activeMonths: Set<number>
  loading?: boolean
}

const INR = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-md p-3 text-sm">
      <p className="font-semibold text-gray-800 mb-2">{String(label)}</p>
      {payload.map((entry: { dataKey: string; color: string; name: string; value: number }) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-gray-500 w-24">{entry.name}:</span>
          <span className="font-medium text-gray-800">{INR(Number(entry.value ?? 0))}</span>
        </div>
      ))}
    </div>
  )
}

export function MonthlyChart({ data, activeMonths, loading }: MonthlyChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-[260px] w-full" />
      </div>
    )
  }

  // Only show months that have data; grey out rest via tick color
  const chartData = data.map((m) => ({
    ...m,
    _hasData: activeMonths.has(m.month),
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Breakdown</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="monthName"
            tick={(props) => {
              const { x, y, payload } = props
              const month = data.find((m) => m.monthName === payload.value)
              const color = month && activeMonths.has(month.month) ? "#374151" : "#D1D5DB"
              return (
                <text x={Number(x)} y={Number(y) + 12} textAnchor="middle" fill={color} fontSize={11}>
                  {payload.value}
                </text>
              )
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) =>
              v >= 100000
                ? `${(v / 100000).toFixed(0)}L`
                : v >= 1000
                ? `${(v / 1000).toFixed(0)}K`
                : `${v}`
            }
            tick={{ fill: "#9CA3AF", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F9FAFB" }} />
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
            iconType="circle"
            iconSize={8}
          />
          <Bar dataKey="income" name="Income" fill="#3B82F6" radius={[3, 3, 0, 0]} maxBarSize={14} />
          <Bar dataKey="emiTotal" name="EMI" fill="#F59E0B" radius={[3, 3, 0, 0]} maxBarSize={14} />
          <Bar dataKey="savings" name="Savings" fill="#10B981" radius={[3, 3, 0, 0]} maxBarSize={14} />
          <Bar dataKey="expenditure" name="Expenditure" fill="#F43F5E" radius={[3, 3, 0, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
