"use client"

import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PassiveIncomeEntry } from "./BondInterestTable"

interface DividendListProps {
  entries: PassiveIncomeEntry[]
  onEdit: (entry: PassiveIncomeEntry) => void
  onDelete: (entry: PassiveIncomeEntry) => void
}

const MONTH_LABELS = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

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

export function DividendList({ entries, onEdit, onDelete }: DividendListProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-base">No dividend entries for this year.</p>
        <p className="text-sm mt-1">Add your first entry using the + Add button above.</p>
      </div>
    )
  }

  // Group by month (use 0 for entries with no month)
  const byMonth = new Map<number, PassiveIncomeEntry[]>()
  for (const entry of entries) {
    const m = entry.month ?? 0
    if (!byMonth.has(m)) byMonth.set(m, [])
    byMonth.get(m)!.push(entry)
  }

  // Source summary
  const bySource = new Map<string, number>()
  for (const entry of entries) {
    const prev = bySource.get(entry.sourceName) ?? 0
    bySource.set(entry.sourceName, prev + Number(entry.amount))
  }

  const annualTotal = entries.reduce((s, e) => s + Number(e.amount), 0)

  // Sort months: numbered months first (1–12), then 0 (no month) at end
  const sortedMonths = Array.from(byMonth.keys()).sort((a, b) => {
    if (a === 0) return 1
    if (b === 0) return -1
    return a - b
  })

  return (
    <div className="space-y-6">
      {/* Monthly groups */}
      {sortedMonths.map((monthNum) => {
        const monthEntries = byMonth.get(monthNum)!
        const monthTotal = monthEntries.reduce((s, e) => s + Number(e.amount), 0)
        const label = monthNum === 0 ? "No Month" : MONTH_LABELS[monthNum]

        return (
          <div key={monthNum}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">{label}</h3>
              <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
                {formatINR(monthTotal)}
              </span>
            </div>
            <div className="border rounded-lg overflow-hidden divide-y divide-gray-100">
              {monthEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between px-4 py-3 bg-white hover:bg-gray-50 group transition-colors"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium text-gray-800">{entry.sourceName}</span>
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
              ))}
            </div>
          </div>
        )
      })}

      {/* Source summary */}
      {bySource.size > 1 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
            Annual Summary by Source
          </h3>
          <div className="border rounded-lg overflow-hidden divide-y divide-gray-100">
            {Array.from(bySource.entries())
              .sort(([, a], [, b]) => b - a)
              .map(([source, total]) => (
                <div key={source} className="flex items-center justify-between px-4 py-2.5 bg-white">
                  <span className="text-sm text-gray-700">{source}</span>
                  <span className="text-sm font-semibold text-gray-800">{formatINR(total)}</span>
                </div>
              ))}
            <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50">
              <span className="text-sm font-semibold text-emerald-700">Total</span>
              <span className="text-sm font-semibold text-emerald-700">{formatINR(annualTotal)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
