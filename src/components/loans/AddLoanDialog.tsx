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
import { Loan, LOAN_TYPE_OPTIONS, LOAN_TYPE_LABELS, LoanType } from "./types"

const optionalNumber = z.string().optional().refine(
  (v) => v == null || v === "" || (!isNaN(Number(v)) && Number(v) >= 0),
  "Must be a valid non-negative number"
)

const formSchema = z.object({
  name: z.string().min(1, "Loan name is required"),
  lender: z.string().optional(),
  loanType: z.enum(["HOME", "PERSONAL", "CAR", "EDUCATION", "GOLD", "OTHER"] as [LoanType, ...LoanType[]]),
  sanctionedAmount: optionalNumber,
  interestRate: optionalNumber,
  tenureMonths: optionalNumber,
  plannedEmiAmount: optionalNumber,
  startDate: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface AddLoanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editLoan?: Loan | null
}

function defaultsFromLoan(editLoan?: Loan | null): FormValues {
  return {
    name: editLoan?.name ?? "",
    lender: editLoan?.lender ?? "",
    loanType: editLoan?.loanType ?? "HOME",
    sanctionedAmount: editLoan?.sanctionedAmount != null ? String(Number(editLoan.sanctionedAmount)) : "",
    interestRate: editLoan?.interestRate != null ? String(Number(editLoan.interestRate)) : "",
    tenureMonths: editLoan?.tenureMonths != null ? String(editLoan.tenureMonths) : "",
    plannedEmiAmount: editLoan?.plannedEmiAmount != null ? String(Number(editLoan.plannedEmiAmount)) : "",
    startDate: editLoan?.startDate ? editLoan.startDate.split("T")[0] : "",
    notes: editLoan?.notes ?? "",
  }
}

export function AddLoanDialog({ open, onOpenChange, onSuccess, editLoan }: AddLoanDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!editLoan

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultsFromLoan(editLoan),
  })

  useEffect(() => {
    if (open) form.reset(defaultsFromLoan(editLoan))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editLoan])

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      const body = {
        name: values.name,
        lender: values.lender || (isEditing ? null : undefined),
        loanType: values.loanType,
        sanctionedAmount: values.sanctionedAmount ? Number(values.sanctionedAmount) : (isEditing ? null : undefined),
        interestRate: values.interestRate ? Number(values.interestRate) : (isEditing ? null : undefined),
        tenureMonths: values.tenureMonths ? Number(values.tenureMonths) : (isEditing ? null : undefined),
        plannedEmiAmount: values.plannedEmiAmount ? Number(values.plannedEmiAmount) : (isEditing ? null : undefined),
        startDate: values.startDate || (isEditing ? null : undefined),
        notes: values.notes || (isEditing ? null : undefined),
      }

      if (isEditing && editLoan) {
        const res = await fetch(`/api/loans/${editLoan.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error ?? "Failed to update loan")
          return
        }
        toast.success("Loan updated successfully")
      } else {
        const res = await fetch("/api/loans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error ?? "Failed to add loan")
          return
        }
        toast.success("Loan added successfully")
      }

      onSuccess()
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
          <DialogTitle>{isEditing ? "Edit Loan" : "Add Loan"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loan Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. My Home Loan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lender (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. HDFC, SBI" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="loanType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loan Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LOAN_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type} value={type}>
                          {LOAN_TYPE_LABELS[type]}
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
                name="sanctionedAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sanctioned (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Optional" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interestRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest Rate (%)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Optional" min={0} step={0.01} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="tenureMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenure (months)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Optional" min={0} step={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plannedEmiAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Planned EMI (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Optional" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {isSubmitting ? "Saving..." : isEditing ? "Update" : "Add Loan"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
