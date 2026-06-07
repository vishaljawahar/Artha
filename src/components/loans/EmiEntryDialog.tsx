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
import { Loan, EmiEntry } from "./types"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const formSchema = z.object({
  userId: z.string().min(1, "Member is required"),
  year: z.string().min(1, "Year is required").refine(
    (v) => {
      const n = Number(v)
      return Number.isInteger(n) && n >= 1900 && n <= 2100
    },
    "Enter a valid year"
  ),
  month: z.string().min(1, "Month is required"),
  plannedShare: z.string().min(1, "Planned share is required").refine(
    (v) => !isNaN(Number(v)) && Number(v) >= 0,
    "Must be a valid non-negative number"
  ),
  actualPaid: z.string().optional().refine(
    (v) => v == null || v === "" || (!isNaN(Number(v)) && Number(v) >= 0),
    "Must be a valid non-negative number"
  ),
  mode: z.string().optional(),
  paidDate: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface EmiEntryDialogProps {
  loan: Loan
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
  editEntry?: EmiEntry | null
  // Optional prefill for a (member, month) cell when adding
  prefill?: { userId?: string; year?: number; month?: number } | null
}

function defaultsFrom(
  loan: Loan,
  editEntry?: EmiEntry | null,
  prefill?: { userId?: string; year?: number; month?: number } | null,
): FormValues {
  const now = new Date()
  return {
    userId: editEntry?.userId ?? prefill?.userId ?? loan.members[0]?.userId ?? "",
    year: String(editEntry?.year ?? prefill?.year ?? now.getFullYear()),
    month: String(editEntry?.month ?? prefill?.month ?? now.getMonth() + 1),
    plannedShare: editEntry ? String(Number(editEntry.plannedShare)) : "",
    actualPaid: editEntry?.actualPaid != null ? String(Number(editEntry.actualPaid)) : "",
    mode: editEntry?.mode ?? "",
    paidDate: editEntry?.paidDate ? editEntry.paidDate.split("T")[0] : "",
    notes: editEntry?.notes ?? "",
  }
}

export function EmiEntryDialog({ loan, open, onOpenChange, onChanged, editEntry, prefill }: EmiEntryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!editEntry

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultsFrom(loan, editEntry, prefill),
  })

  useEffect(() => {
    if (open) form.reset(defaultsFrom(loan, editEntry, prefill))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editEntry, prefill])

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      const body = {
        userId: values.userId,
        year: Number(values.year),
        month: Number(values.month),
        plannedShare: Number(values.plannedShare),
        actualPaid: values.actualPaid ? Number(values.actualPaid) : undefined,
        mode: values.mode || undefined,
        paidDate: values.paidDate || undefined,
        notes: values.notes || undefined,
      }

      // POST is an upsert (create or update on userId+year+month)
      const res = await fetch(`/api/loans/${loan.id}/emis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Failed to save EMI")
        return
      }
      toast.success(isEditing ? "EMI updated" : "EMI saved")

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
          <DialogTitle>{isEditing ? "Edit EMI Entry" : "Add EMI Entry"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member</FormLabel>
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
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Month</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MONTH_NAMES.map((name, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2026" min={1900} max={2100} step={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="plannedShare"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Planned Share (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="actualPaid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Paid (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Optional" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Auto-debit" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paidDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid Date (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                {isSubmitting ? "Saving..." : isEditing ? "Update" : "Add EMI"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
