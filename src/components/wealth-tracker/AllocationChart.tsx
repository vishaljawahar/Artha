"use client"

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { Asset, AssetType, ASSET_TYPE_COLORS, ASSET_TYPE_LABELS, formatINR } from "./types"

interface AllocationChartProps {
  currentAssets: Asset[]
}

interface ChartEntry {
  name: string
  value: number
  color: string
  assetType: AssetType
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: ChartEntry }[] }) => {
  if (active && payload && payload.length) {
    const entry = payload[0].payload
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2">
        <p className="text-sm font-medium text-gray-800">{entry.name}</p>
        <p className="text-sm text-gray-600">{formatINR(entry.value)}</p>
      </div>
    )
  }
  return null
}

export function AllocationChart({ currentAssets }: AllocationChartProps) {
  // Group by assetType and sum values
  const grouped = new Map<AssetType, number>()
  for (const asset of currentAssets) {
    const val = Number(asset.currentValue)
    const existing = grouped.get(asset.assetType) ?? 0
    grouped.set(asset.assetType, existing + val)
  }

  const data: ChartEntry[] = Array.from(grouped.entries())
    .map(([assetType, value]) => ({
      name: ASSET_TYPE_LABELS[assetType],
      value,
      color: ASSET_TYPE_COLORS[assetType],
      assetType,
    }))
    .sort((a, b) => b.value - a.value)

  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-center h-[320px]">
        <p className="text-gray-400 text-sm">No asset data yet</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Asset Allocation</h3>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="w-full sm:w-[180px] flex-shrink-0">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-2">
          {data.map((entry) => {
            const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0"
            return (
              <div key={entry.assetType} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs text-gray-600 truncate">{entry.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-medium text-gray-800">{formatINR(entry.value)}</span>
                  <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
