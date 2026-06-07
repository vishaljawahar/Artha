"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Loan,
  LoanPayment,
  LoanPaymentType,
  LOAN_PAYMENT_TYPE_OPTIONS,
  LOAN_PAYMENT_TYPE_LABELS,
} from "./types"

const formSchema = z.object({
  paidById: z.string().min(1, "Payer is required"),
  date: z.string().min(1, "Date is required"),
  type: z.enum(["BOOKING", "DOWN_PAYMENT", "INSTALLMENT", "TDS", "AGREEMENT", "FEE", "OTHER"] as [LoanPaymentType, ...LoanPaymentType[]]),
  description: z.string().optional(),
  amount: z.string().min(1, "Amount is required").refine(
    (v) => !isNaN(Number(v)) && Number(v) >= 0,
    "Must be a valid non-negative number"
  ),
  mode: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface AddPaymentDialogProps {
  loan: Loan
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
  editPayment?: LoanPayment | null
}

function defaultsFrom(loan: Loan, editPayment?: LoanPayment | null): FormValues {
  const todayStr = new Date().toISOString().split("T")[0]
  return {
    paidById: editPayment?.paidById ?? loan.members[0]?.userId ?? "",
    date: editPayment ? editPayment.date.split("T")[0] : todayStr,
    type: editPayment?.type ?? "INSTALLMENT",
    description: editPayment?.description ?? "",
    amount: editPayment ? String(Number(editPayment.amount)) : "",
    mode: editPayment?.mode ?? "",
    notes: editPayment?.notes ?? "",
  }
}

export function AddPaymentDialog({ loan, open, onOpenChange, onChanged, editPayment }: AddPaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!editPayment

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultsFrom(loan, editPayment),
  })

  useEffect(() => {
    if (open) form.reset(defaultsFrom(loan, editPayment))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editPayment])

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      const body = {
        paidById: values.paidById,
        date: values.date,
        type: values.type,
        description: values.description || undefined,
        amount: Number(values.amount),
        mode: values.mode || undefined,
        notes: values.notes || undefined,
      }

      if (isEditing && editPayment) {
        const res = await fetch(`/api/loans/${loan.id}/payments/${editPayment.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error ?? "Failed to update payment")
          return
        }
        toast.success("Payment updated")
      } else {
        const res = await fetch(`/api/loans/${loan.id}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error ?? "Failed to add payment")
          return
        }
        toast.success("Payment added")
      }

      onChanged()
      onOpenChange(false)
      form.reset()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) form.reset() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Payment" : "Add Payment"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="paidById"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid By</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loan.members.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LOAN_PAYMENT_TYPE_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {LOAN_PAYMENT_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Booking amount" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. UPI, NEFT" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any notes..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => { onOpenChange(false); form.reset() }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting ? "Saving..." : isEditing ? "Update" : "Add Payment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
