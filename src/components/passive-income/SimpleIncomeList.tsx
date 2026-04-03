"use client"

import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PassiveIncomeEntry } from "./BondInterestTable"

interface SimpleIncomeListProps {
  entries: PassiveIncomeEntry[]
  groupBy?: "sourceName"
  onEdit: (entry: PassiveIncomeEntry) => void
  onDelete: (entry: PassiveIncomeEntry) => void
  emptyMessage?: string
}

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)

const formatDate = (date: string | null) => {
  if (!date) return null
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  BOND_INTEREST: "Bond Interest",
  SB_INTEREST: "SB Interest",
  DIVIDEND: "Dividend",
  PROFIT: "Profit",
  OTHER: "Other",
}

export function SimpleIncomeList({
  entries,
  groupBy,
  onEdit,
  onDelete,
  emptyMessage = "No entries for this year.",
}: SimpleIncomeListProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-base">{emptyMessage}</p>
        <p className="text-sm mt-1">Add your first entry using the + Add button above.</p>
      </div>
    )
  }

  if (!groupBy) {
    // Flat chronological list (for "Other" tab)
    return (
      <div className="space-y-2">
        {entries.map((entry) => (
          <EntryRow key={entry.id} entry={entry} showType onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    )
  }

  // Group by sourceName
  const groups = new Map<string, PassiveIncomeEntry[]>()
  for (const entry of entries) {
    if (!groups.has(entry.sourceName)) groups.set(entry.sourceName, [])
    groups.get(entry.sourceName)!.push(entry)
  }

  return (
    <div className="space-y-6">
      {Array.from(groups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([sourceName, groupEntries]) => {
          const subtotal = groupEntries.reduce((s, e) => s + Number(e.amount), 0)
          return (
            <div key={sourceName}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
                  {sourceName}
                </h3>
                <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
                  {formatINR(subtotal)}
                </span>
              </div>
              <div className="space-y-1.5 border rounded-lg overflow-hidden divide-y divide-gray-100">
                {groupEntries.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </div>
            </div>
          )
        })}
    </div>
  )
}

function EntryRow({
  entry,
  showType,
  onEdit,
  onDelete,
}: {
  entry: PassiveIncomeEntry
  showType?: boolean
  onEdit: (e: PassiveIncomeEntry) => void
  onDelete: (e: PassiveIncomeEntry) => void
}) {
  return (
    <div className="flex items-start justify-between px-4 py-3 bg-white hover:bg-gray-50 group transition-colors">
      <div className="flex flex-col gap-0.5 min-w-0">
        {showType && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
              {SOURCE_TYPE_LABELS[entry.sourceType] ?? entry.sourceType}
            </span>
            <span className="text-sm font-medium text-gray-800 truncate">{entry.sourceName}</span>
          </div>
        )}
        {entry.receivedDate && (
          <span className="text-xs text-gray-400">{formatDate(entry.receivedDate)}</span>
        )}
        {entry.notes && (
          <span className="text-xs text-gray-500 italic">{entry.notes}</span>
        )}
      </div>
      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        <span className="font-semibold text-gray-800">{formatINR(Number(entry.amount))}</span>
        <div className="hidden group-hover:flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-blue-600"
            onClick={() => onEdit(entry)}
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-red-600"
            onClick={() => onDelete(entry)}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
