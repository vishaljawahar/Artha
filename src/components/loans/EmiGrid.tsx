"use client"

import { useState, Fragment } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Loan, EmiEntry, formatINR } from "./types"
import { EmiEntryDialog } from "./EmiEntryDialog"

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

interface EmiGridProps {
  loan: Loan
  onChanged: () => void
}

export function EmiGrid({ loan, onChanged }: EmiGridProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<EmiEntry | null>(null)
  const [prefill, setPrefill] = useState<{ userId?: string; year?: number; month?: number } | null>(null)

  const members = loan.members

  // Build a lookup: "year-month-userId" -> EmiEntry
  const entryByKey = new Map<string, EmiEntry>()
  const monthKeys = new Set<string>()
  for (const e of loan.emiEntries) {
    const mKey = `${e.year}-${String(e.month).padStart(2, "0")}`
    monthKeys.add(mKey)
    entryByKey.set(`${mKey}-${e.userId}`, e)
  }

  const sortedMonths = Array.from(monthKeys).sort()

  const openAdd = () => {
    setEditEntry(null)
    setPrefill(null)
    setDialogOpen(true)
  }

  const openCell = (entry: EmiEntry | undefined, mKey: string, userId: string) => {
    if (entry) {
      setEditEntry(entry)
      setPrefill(null)
    } else {
      const [year, month] = mKey.split("-").map(Number)
      setEditEntry(null)
      setPrefill({ userId, year, month })
    }
    setDialogOpen(true)
  }

  const handleDelete = async (emiId: string) => {
    try {
      const res = await fetch(`/api/loans/${loan.id}/emis/${emiId}`, { method: "DELETE" })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error ?? "Delete failed")
        return
      }
      toast.success("EMI entry deleted")
      onChanged()
    } catch {
      toast.error("Delete failed")
    }
  }

  const monthLabel = (mKey: string) => {
    const [year, month] = mKey.split("-").map(Number)
    return `${MONTH_ABBR[month - 1]} ${year}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">EMIs (Planned vs Paid)</h2>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          size="sm"
          onClick={openAdd}
        >
          <Plus className="h-4 w-4" />
          Add EMI
        </Button>
      </div>

      {sortedMonths.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl bg-background">
          <p className="text-sm text-muted-foreground">No EMI entries recorded yet.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead rowSpan={2} className="align-bottom whitespace-nowrap">Month</TableHead>
                {members.map((m) => (
                  <TableHead
                    key={m.userId}
                    colSpan={2}
                    className="text-center border-l border-border whitespace-nowrap"
                  >
                    {m.user.name}
                  </TableHead>
                ))}
                <TableHead rowSpan={2} className="align-bottom text-right border-l border-border whitespace-nowrap">
                  Total Paid
                </TableHead>
              </TableRow>
              <TableRow>
                {members.map((m) => (
                  <Fragment key={m.userId}>
                    <TableHead className="text-right text-xs font-normal border-l border-border">Planned</TableHead>
                    <TableHead className="text-right text-xs font-normal">Paid</TableHead>
                  </Fragment>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMonths.map((mKey) => {
                let monthTotal = 0
                for (const m of members) {
                  const e = entryByKey.get(`${mKey}-${m.userId}`)
                  if (e) {
                    monthTotal += e.actualPaid != null ? Number(e.actualPaid) : Number(e.plannedShare)
                  }
                }
                return (
                  <TableRow key={mKey}>
                    <TableCell className="font-medium whitespace-nowrap">{monthLabel(mKey)}</TableCell>
                    {members.map((m) => {
                      const e = entryByKey.get(`${mKey}-${m.userId}`)
                      return (
                        <EmiCellPair
                          key={m.userId}
                          entry={e}
                          onEdit={() => openCell(e, mKey, m.userId)}
                          onDelete={handleDelete}
                        />
                      )
                    })}
                    <TableCell className="text-right font-medium border-l border-border whitespace-nowrap">
                      {monthTotal > 0 ? formatINR(monthTotal) : "—"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <EmiEntryDialog
        loan={loan}
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditEntry(null); setPrefill(null) } }}
        onChanged={onChanged}
        editEntry={editEntry}
        prefill={prefill}
      />
    </div>
  )
}

function EmiCellPair({
  entry,
  onEdit,
  onDelete,
}: {
  entry: EmiEntry | undefined
  onEdit: () => void
  onDelete: (id: string) => void
}) {
  const planned = entry != null ? Number(entry.plannedShare) : null
  const paid = entry?.actualPaid != null ? Number(entry.actualPaid) : null

  return (
    <>
      <TableCell className="text-right text-muted-foreground border-l border-border whitespace-nowrap">
        {planned != null ? formatINR(planned) : "—"}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1">
          <span>{paid != null ? formatINR(paid) : "—"}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={onEdit}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          {entry && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete EMI Entry</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this EMI entry? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => onDelete(entry.id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </TableCell>
    </>
  )
}
