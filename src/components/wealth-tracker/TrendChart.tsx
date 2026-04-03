"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { Asset, formatINR } from "./types"

interface TrendChartProps {
  assets: Asset[]
}

interface TrendPoint {
  date: string
  displayDate: string
  total: number
}

function formatYAxis(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`
  return `₹${v}`
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-sm font-semibold text-gray-800">{formatINR(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export function TrendChart({ assets }: TrendChartProps) {
  // Group by recordedDate, sum currentValues per date
  const dateMap = new Map<string, number>()
  for (const asset of assets) {
    const dateKey = asset.recordedDate.split("T")[0]
    const existing = dateMap.get(dateKey) ?? 0
    dateMap.set(dateKey, existing + Number(asset.currentValue))
  }

  const trendData: TrendPoint[] = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => {
      const d = new Date(date)
      const displayDate = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
      return { date, displayDate, total }
    })

  if (trendData.length < 2) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Net Worth Trend</h3>
        <div className="flex items-center justify-center h-[180px]">
          <p className="text-gray-400 text-sm text-center">
            Add more snapshots over time to see your wealth trend
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Net Worth Trend</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="displayDate"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#10B981"
            strokeWidth={2.5}
            dot={{ fill: "#10B981", r: 4, strokeWidth: 2, stroke: "white" }}
            activeDot={{ r: 6, fill: "#10B981", stroke: "white", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
