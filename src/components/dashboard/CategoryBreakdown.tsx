"use client"

import { Skeleton } from "@/components/ui/skeleton"

interface CategoryItem {
  categoryId: string
  categoryName: string
  categoryColor: string | null
  total: number
}

interface CategoryBreakdownProps {
  data: CategoryItem[]
  loading?: boolean
}

const DEFAULT_COLORS = [
  "#10B981", "#3B82F6", "#F59E0B", "#F43F5E", "#8B5CF6",
  "#06B6D4", "#EC4899", "#84CC16", "#F97316", "#A855F7",
]

const INR = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v)

export function CategoryBreakdown({ data, loading }: CategoryBreakdownProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="w-2.5 h-2.5 rounded-full flex-shrink-0" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="flex-1 h-1.5" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center justify-center h-[200px]">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 self-start">Spending by Category</h3>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-2">
            <span className="text-xl">📊</span>
          </div>
          <p className="text-sm text-gray-400">No spending data yet</p>
        </div>
      </div>
    )
  }

  const total = data.reduce((s, c) => s + c.total, 0)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex justify-between items-baseline mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Spending by Category</h3>
        <span className="text-sm text-gray-500">{INR(total)}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
        {data.map((cat, i) => {
          const color = cat.categoryColor ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]
          const pct = total > 0 ? (cat.total / total) * 100 : 0
          return (
            <div key={cat.categoryId} className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-gray-700 w-32 truncate flex-shrink-0" title={cat.categoryName}>
                {cat.categoryName}
              </span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-0">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct.toFixed(1)}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-xs text-gray-600 tabular-nums w-16 text-right flex-shrink-0">
                {INR(cat.total)}
              </span>
              <span className="text-xs text-gray-400 w-8 text-right flex-shrink-0">
                {pct.toFixed(0)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
