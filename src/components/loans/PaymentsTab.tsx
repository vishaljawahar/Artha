"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Download } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
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
import { Loan, LoanPayment, LOAN_PAYMENT_TYPE_LABELS, formatINR, formatDate } from "./types"
import { exportLoanPaymentsPdf } from "./loan-pdf"
import { AddPaymentDialog } from "./AddPaymentDialog"

interface PaymentsTabProps {
  loan: Loan
  onChanged: () => void
}

export function PaymentsTab({ loan, onChanged }: PaymentsTabProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [editPayment, setEditPayment] = useState<LoanPayment | null>(null)

  const payments = [...loan.payments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const totalAmount = payments.reduce((s, p) => s + Number(p.amount), 0)

  const handleDelete = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/loans/${loan.id}/payments/${paymentId}`, { method: "DELETE" })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error ?? "Delete failed")
        return
      }
      toast.success("Payment deleted")
      onChanged()
    } catch {
      toast.error("Delete failed")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Payments</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={payments.length === 0}
            onClick={() => exportLoanPaymentsPdf(loan)}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export PDF</span>
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            size="sm"
            onClick={() => { setEditPayment(null); setAddOpen(true) }}
          >
            <Plus className="h-4 w-4" />
            Add Payment
          </Button>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl bg-background">
          <p className="text-sm text-muted-foreground">No one-off payments recorded yet.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Paid By</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(p.date)}</TableCell>
                  <TableCell className="whitespace-nowrap">{LOAN_PAYMENT_TYPE_LABELS[p.type]}</TableCell>
                  <TableCell className="text-muted-foreground">{p.description || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{p.paidBy?.name ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{p.mode || "—"}</TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap">{formatINR(Number(p.amount))}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => { setEditPayment(p); setAddOpen(true) }}
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
                            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this {formatINR(Number(p.amount))} payment? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => handleDelete(p.id)}
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
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold whitespace-nowrap">{formatINR(totalAmount)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}

      <AddPaymentDialog
        loan={loan}
        open={addOpen}
        onOpenChange={(v) => { setAddOpen(v); if (!v) setEditPayment(null) }}
        onChanged={onChanged}
        editPayment={editPayment}
      />
    </div>
  )
}
