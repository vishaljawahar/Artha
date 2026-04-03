"use client"

import { useEffect, useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import type { AnnualEntry } from "./EntrySection"

const formSchema = z.object({
  entryType: z.enum(["ASSET", "LIABILITY"]),
  category: z.string().min(1, "Category is required"),
  particulars: z.string().min(1, "Particulars are required"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be a positive number"),
  entryDate: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface AddEditDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  year: number
  editEntry?: AnnualEntry | null
  categoryOptions: string[]
}

export function AddEditDialog({
  open,
  onClose,
  onSuccess,
  year,
  editEntry,
  categoryOptions,
}: AddEditDialogProps) {
  const [loading, setLoading] = useState(false)
  const isEdit = !!editEntry

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entryType: "ASSET",
      category: "",
      particulars: "",
      amount: "",
      entryDate: "",
      notes: "",
    },
  })

  useEffect(() => {
    if (open) {
      if (editEntry) {
        form.reset({
          entryType: editEntry.entryType,
          category: editEntry.category,
          particulars: editEntry.particulars,
          amount: String(Number(editEntry.amount)),
          entryDate: editEntry.entryDate
            ? new Date(editEntry.entryDate).toISOString().split("T")[0]
            : "",
          notes: editEntry.notes ?? "",
        })
      } else {
        form.reset({
          entryType: "ASSET",
          category: "",
          particulars: "",
          amount: "",
          entryDate: "",
          notes: "",
        })
      }
    }
  }, [open, editEntry, form])

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    try {
      const payload = {
        ...(isEdit ? {} : { year }),
        entryType: values.entryType,
        category: values.category.trim(),
        particulars: values.particulars.trim(),
        amount: Number(values.amount),
        entryDate: values.entryDate || undefined,
        notes: values.notes?.trim() || undefined,
      }

      const url = isEdit
        ? `/api/annual-entries/${editEntry!.id}`
        : "/api/annual-entries"
      const method = isEdit ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Something went wrong")
        return
      }

      toast.success(isEdit ? "Entry updated" : "Entry added")
      onSuccess()
      onClose()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  // Deduplicate category options and add any new ones typed in existing field
  const datalistId = "annual-category-list"

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Entry" : `Add Entry — ${year}`}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            {/* Type */}
            <FormField
              control={form.control}
              name="entryType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="ASSET" id="type-asset" />
                        <Label
                          htmlFor="type-asset"
                          className="cursor-pointer font-normal text-emerald-700"
                        >
                          Asset
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="LIABILITY" id="type-liability" />
                        <Label
                          htmlFor="type-liability"
                          className="cursor-pointer font-normal text-gray-700"
                        >
                          Liability / Expense
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <>
                      <datalist id={datalistId}>
                        {categoryOptions.map((opt) => (
                          <option key={opt} value={opt} />
                        ))}
                      </datalist>
                      <Input
                        {...field}
                        list={datalistId}
                        placeholder="e.g. PPF, House Related, Trips"
                        autoComplete="off"
                      />
                    </>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Particulars */}
            <FormField
              control={form.control}
              name="particulars"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Particulars</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. Property Tax, Axis MF SIP"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Entry Date */}
            <FormField
              control={form.control}
              name="entryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Entry Date{" "}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Notes{" "}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Any additional details..."
                      rows={2}
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? "Saving…" : isEdit ? "Save Changes" : "Add Entry"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
