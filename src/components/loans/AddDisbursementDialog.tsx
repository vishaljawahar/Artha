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
import { Textarea } from "@/components/ui/textarea"
import { Loan, LoanDisbursement } from "./types"

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  amount: z.string().min(1, "Amount is required").refine(
    (v) => !isNaN(Number(v)) && Number(v) >= 0,
    "Must be a valid non-negative number"
  ),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface AddDisbursementDialogProps {
  loan: Loan
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
  editDisbursement?: LoanDisbursement | null
}

function defaultsFrom(editDisbursement?: LoanDisbursement | null): FormValues {
  const todayStr = new Date().toISOString().split("T")[0]
  return {
    date: editDisbursement ? editDisbursement.date.split("T")[0] : todayStr,
    amount: editDisbursement ? String(Number(editDisbursement.amount)) : "",
    notes: editDisbursement?.notes ?? "",
  }
}

export function AddDisbursementDialog({ loan, open, onOpenChange, onChanged, editDisbursement }: AddDisbursementDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!editDisbursement

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultsFrom(editDisbursement),
  })

  useEffect(() => {
    if (open) form.reset(defaultsFrom(editDisbursement))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editDisbursement])

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      const body = {
        date: values.date,
        amount: Number(values.amount),
        notes: values.notes || undefined,
      }

      if (isEditing && editDisbursement) {
        const res = await fetch(`/api/loans/${loan.id}/disbursements/${editDisbursement.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error ?? "Failed to update disbursement")
          return
        }
        toast.success("Disbursement updated")
      } else {
        const res = await fetch(`/api/loans/${loan.id}/disbursements`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error ?? "Failed to add disbursement")
          return
        }
        toast.success("Disbursement added")
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
          <DialogTitle>{isEditing ? "Edit Disbursement" : "Add Disbursement"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g. Tranche 1 disbursed to builder" rows={2} {...field} />
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
                {isSubmitting ? "Saving..." : isEditing ? "Update" : "Add Disbursement"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
