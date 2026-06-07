"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface PassiveIncomeEntry {
  id: string
  year: number
  month: number | null
  sourceType: string
  sourceName: string
  amount: string | number
  receivedDate: string | null
  notes: string | null
  createdAt: string
}

interface BondInterestTableProps {
  entries: PassiveIncomeEntry[]
  onEdit: (entry: PassiveIncomeEntry) => void
  onDelete: (entry: PassiveIncomeEntry) => void
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)

export function BondInterestTable({ entries, onEdit, onDelete }: BondInterestTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-base">No bond interest entries for this year.</p>
        <p className="text-sm mt-1">Add your first entry using the + Add button above.</p>
      </div>
    )
  }

  // Get unique source names
  const sources = Array.from(new Set(entries.map((e) => e.sourceName))).sort()

  // Build a lookup: month -> sourceName -> entries[]
  const lookup = new Map<string, PassiveIncomeEntry[]>()
  for (const entry of entries) {
    const key = `${entry.month ?? 0}__${entry.sourceName}`
    if (!lookup.has(key)) lookup.set(key, [])
    lookup.get(key)!.push(entry)
  }

  // Column totals
  const colTotals: Record<string, number> = {}
  for (const src of sources) colTotals[src] = 0

  const rowData = MONTHS.map((label, idx) => {
    const monthNum = idx + 1
    let rowTotal = 0
    const cells: Record<string, { entries: PassiveIncomeEntry[]; total: number }> = {}
    for (const src of sources) {
      const key = `${monthNum}__${src}`
      const es = lookup.get(key) ?? []
      const total = es.reduce((s, e) => s + Number(e.amount), 0)
      cells[src] = { entries: es, total }
      rowTotal += total
      colTotals[src] += total
    }
    return { label, monthNum, cells, rowTotal }
  })

  const grandTotal = Object.values(colTotals).reduce((s, v) => s + v, 0)

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28 font-semibold text-foreground">Month</TableHead>
            {sources.map((src) => (
              <TableHead key={src} className="text-right font-semibold text-foreground min-w-32">
                {src}
              </TableHead>
            ))}
            <TableHead className="text-right font-semibold text-foreground w-28">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rowData.map(({ label, cells, rowTotal }) => (
            <TableRow key={label} className="group">
              <TableCell className="font-medium text-foreground">{label}</TableCell>
              {sources.map((src) => {
                const cell = cells[src]
                return (
                  <TableCell key={src} className="text-right">
                    {cell.total > 0 ? (
                      <div className="flex flex-col gap-0.5 items-end">
                        {cell.entries.map((e) => (
                          <div key={e.id} className="flex items-center gap-1 group/cell">
                            <span className="text-foreground text-sm">{formatINR(Number(e.amount))}</span>
                            <span className="hidden group-hover/cell:flex items-center gap-0.5 ml-1">
                              <button
                                onClick={() => onEdit(e)}
                                className="text-xs text-muted-foreground hover:text-blue-600 transition-colors px-0.5"
                                title="Edit"
                              >
                                ✎
                              </button>
                              <button
                                onClick={() => onDelete(e)}
                                className="text-xs text-muted-foreground hover:text-red-600 transition-colors px-0.5"
                                title="Delete"
                              >
                                ✕
                              </button>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                )
              })}
              <TableCell className="text-right font-medium text-foreground">
                {rowTotal > 0 ? formatINR(rowTotal) : <span className="text-muted-foreground">—</span>}
              </TableCell>
            </TableRow>
          ))}
          {/* Column totals row */}
          <TableRow className="border-t-2 border-border bg-muted font-semibold">
            <TableCell className="text-foreground">Total</TableCell>
            {sources.map((src) => (
              <TableCell key={src} className="text-right text-foreground">
                {colTotals[src] > 0 ? formatINR(colTotals[src]) : <span className="text-muted-foreground">—</span>}
              </TableCell>
            ))}
            <TableCell className="text-right text-emerald-700 dark:text-emerald-400">
              {grandTotal > 0 ? formatINR(grandTotal) : <span className="text-muted-foreground">—</span>}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
