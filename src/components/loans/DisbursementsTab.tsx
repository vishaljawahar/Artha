"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Download } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
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
import { Loan, LoanDisbursement, formatINR, formatDate } from "./types"
import { AddDisbursementDialog } from "./AddDisbursementDialog"
import { exportLoanDisbursementsPdf } from "./loan-pdf"

interface DisbursementsTabProps {
  loan: Loan
  onChanged: () => void
}

export function DisbursementsTab({ loan, onChanged }: DisbursementsTabProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [editDisbursement, setEditDisbursement] = useState<LoanDisbursement | null>(null)

  const { progress } = loan.summary
  const disbursedPct = Math.min(100, Math.max(0, progress.disbursedPct))

  const disbursements = [...loan.disbursements].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const handleDelete = async (disbId: string) => {
    try {
      const res = await fetch(`/api/loans/${loan.id}/disbursements/${disbId}`, { method: "DELETE" })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error ?? "Delete failed")
        return
      }
      toast.success("Disbursement deleted")
      onChanged()
    } catch {
      toast.error("Delete failed")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Disbursements</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={loan.disbursements.length === 0}
            onClick={() => exportLoanDisbursementsPdf(loan)}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export PDF</span>
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            size="sm"
            onClick={() => { setEditDisbursement(null); setAddOpen(true) }}
          >
            <Plus className="h-4 w-4" />
            Add Disbursement
          </Button>
        </div>
      </div>

      {/* Disbursed vs Sanctioned summary */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-xs text-muted-foreground mb-1">Disbursed vs Sanctioned</p>
        <p className="text-2xl font-bold text-foreground">
          {formatINR(progress.disbursed)}
          <span className="text-sm font-normal text-muted-foreground"> / {formatINR(progress.sanctioned)}</span>
        </p>
        <div className="mt-3">
          <Progress value={disbursedPct} className="h-2 [&>div]:bg-emerald-600" />
          <p className="text-xs text-muted-foreground mt-1">{disbursedPct.toFixed(0)}% disbursed</p>
        </div>
      </div>

      {disbursements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl bg-background">
          <p className="text-sm text-muted-foreground">No disbursements recorded yet.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disbursements.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(d.date)}</TableCell>
                  <TableCell className="text-muted-foreground">{d.notes || "—"}</TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap">{formatINR(Number(d.amount))}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => { setEditDisbursement(d); setAddOpen(true) }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Disbursement</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this {formatINR(Number(d.amount))} disbursement? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => handleDelete(d.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddDisbursementDialog
        loan={loan}
        open={addOpen}
        onOpenChange={(v) => { setAddOpen(v); if (!v) setEditDisbursement(null) }}
        onChanged={onChanged}
        editDisbursement={editDisbursement}
      />
    </div>
  )
}
