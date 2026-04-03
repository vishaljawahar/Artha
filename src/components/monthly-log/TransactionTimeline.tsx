"use client"

import { Pencil, Trash2 } from "lucide-react"
import { Transaction, Category } from "./types"

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
}

interface TransactionTimelineProps {
  transactions: Transaction[]
  categories: Category[]
  onEdit: (t: Transaction) => void
  onDelete: (t: Transaction) => void
}

export function TransactionTimeline({
  transactions,
  categories,
  onEdit,
  onDelete,
}: TransactionTimelineProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">No transactions yet.</p>
        <p className="text-xs mt-1">Add your first one with the + button.</p>
      </div>
    )
  }

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="divide-y divide-gray-100">
        {transactions.map((t) => {
          const cat = categoryMap[t.categoryId] ?? t.category ?? null
          return (
            <div
              key={t.id}
              className="group flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Date */}
                <span className="text-xs text-gray-400 w-14 flex-shrink-0">
                  {formatDate(t.date)}
                </span>

                {/* Category chip */}
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 border"
                  style={{
                    backgroundColor: cat?.color ? `${cat.color}18` : "#f3f4f6",
                    borderColor: cat?.color ? `${cat.color}40` : "#e5e7eb",
                    color: cat?.color ?? "#374151",
                  }}
                >
                  {cat?.icon && <span>{cat.icon}</span>}
                  {cat?.name ?? "Unknown"}
                </span>

                {/* Subcategory */}
                {t.subcategory && (
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 flex-shrink-0">
                    {t.subcategory}
                  </span>
                )}

                {/* Description */}
                <span className="text-sm text-gray-700 truncate min-w-0">
                  {t.description || <span className="text-gray-400 italic">No description</span>}
                </span>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                <span className="text-sm font-semibold text-gray-900">
                  {formatINR(Number(t.amount))}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(t)}
                    className="p-1 rounded text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(t)}
                    className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
