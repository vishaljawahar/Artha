"use client"

import { Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
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

interface TransactionGroupedProps {
  transactions: Transaction[]
  categories: Category[]
  onEdit: (t: Transaction) => void
  onDelete: (t: Transaction) => void
}

interface GroupData {
  category: Category | null
  categoryId: string
  transactions: Transaction[]
  subtotal: number
}

export function TransactionGrouped({
  transactions,
  categories,
  onEdit,
  onDelete,
}: TransactionGroupedProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">No transactions yet.</p>
        <p className="text-xs mt-1">Add your first one with the + button.</p>
      </div>
    )
  }

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  // Group by categoryId
  const groupMap = new Map<string, GroupData>()
  for (const t of transactions) {
    if (!groupMap.has(t.categoryId)) {
      groupMap.set(t.categoryId, {
        category: categoryMap[t.categoryId] ?? t.category ?? null,
        categoryId: t.categoryId,
        transactions: [],
        subtotal: 0,
      })
    }
    const group = groupMap.get(t.categoryId)!
    group.transactions.push(t)
    group.subtotal += Number(t.amount)
  }

  // Sort groups by subtotal descending
  const groups = Array.from(groupMap.values()).sort((a, b) => b.subtotal - a.subtotal)

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.categoryId} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Group header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              {group.category?.color && (
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: group.category.color }}
                />
              )}
              <span className="text-sm font-semibold text-gray-800">
                {group.category?.icon ? `${group.category.icon} ` : ""}
                {group.category?.name ?? "Unknown"}
              </span>
              <span className="text-xs text-gray-400">
                ({group.transactions.length})
              </span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {formatINR(group.subtotal)}
            </span>
          </div>

          {/* Transactions */}
          <div className="divide-y divide-gray-100">
            {group.transactions.map((t) => (
              <TransactionRow key={t.id} transaction={t} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TransactionRow({
  transaction: t,
  onEdit,
  onDelete,
}: {
  transaction: Transaction
  onEdit: (t: Transaction) => void
  onDelete: (t: Transaction) => void
}) {
  return (
    <div className="group flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs text-gray-400 w-14 flex-shrink-0">
          {formatDate(t.date)}
        </span>
        <div className="min-w-0">
          {t.subcategory && (
            <span className="inline-block text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 mr-2 mb-0.5">
              {t.subcategory}
            </span>
          )}
          <span className={cn("text-sm text-gray-700 truncate", t.subcategory ? "block" : "inline")}>
            {t.description || <span className="text-gray-400 italic">No description</span>}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
        <span className="text-sm font-semibold text-gray-900">{formatINR(Number(t.amount))}</span>
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
}
