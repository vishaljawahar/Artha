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
  // Get all unique snapshot dates, sorted chronologically
  const allDates = [...new Set(assets.map(a => a.recordedDate.split("T")[0]))].sort()

  // For each date, compute net worth by taking the latest known value of each
  // asset recorded on or before that date. This ensures newly added assets don't
  // create a downward spike — older assets are carried forward at their last value.
  const trendData: TrendPoint[] = allDates.map(date => {
    const latestValueByName = new Map<string, number>()
    const latestDateByName = new Map<string, string>()

    for (const asset of assets) {
      const assetDate = asset.recordedDate.split("T")[0]
      if (assetDate <= date) {
        const prevDate = latestDateByName.get(asset.assetName) ?? ""
        if (assetDate >= prevDate) {
          latestValueByName.set(asset.assetName, Number(asset.currentValue))
          latestDateByName.set(asset.assetName, assetDate)
        }
      }
    }

    const total = Array.from(latestValueByName.values()).reduce((sum, v) => sum + v, 0)
    const d = new Date(date)
    return {
      date,
      displayDate: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      total,
    }
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
