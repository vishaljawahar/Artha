"use client"

import { useState } from "react"
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
import { Asset, ASSET_TYPE_OPTIONS, ASSET_TYPE_LABELS, AssetType } from "./types"

const formSchema = z.object({
  assetName: z.string().min(1, "Asset name is required"),
  assetType: z.enum(["PPF", "STOCKS", "BONDS", "US_STOCKS", "FIXED_DEPOSIT", "MUTUAL_FUNDS", "SMALLCASE", "LIC", "GOLD", "CRYPTO", "PROPERTY", "OTHER"] as [AssetType, ...AssetType[]]),
  currentValue: z.string().min(1, "Current value is required").refine(
    (v) => !isNaN(Number(v)) && Number(v) >= 0,
    "Must be a valid non-negative number"
  ),
  investedAmount: z.string().optional(),
  recordedDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface AddAssetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editAsset?: Asset | null
}

export function AddAssetDialog({ open, onOpenChange, onSuccess, editAsset }: AddAssetDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!editAsset

  const todayStr = new Date().toISOString().split("T")[0]

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assetName: editAsset?.assetName ?? "",
      assetType: editAsset?.assetType ?? "STOCKS",
      currentValue: editAsset ? String(Number(editAsset.currentValue)) : "",
      investedAmount: editAsset?.investedAmount != null ? String(Number(editAsset.investedAmount)) : "",
      recordedDate: editAsset ? editAsset.recordedDate.split("T")[0] : todayStr,
      notes: editAsset?.notes ?? "",
    },
  })

  // Reset form when editAsset changes
  useState(() => {
    if (open) {
      form.reset({
        assetName: editAsset?.assetName ?? "",
        assetType: editAsset?.assetType ?? "STOCKS",
        currentValue: editAsset ? String(Number(editAsset.currentValue)) : "",
        investedAmount: editAsset?.investedAmount != null ? String(Number(editAsset.investedAmount)) : "",
        recordedDate: editAsset ? editAsset.recordedDate.split("T")[0] : todayStr,
        notes: editAsset?.notes ?? "",
      })
    }
  })

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      const body = {
        assetName: values.assetName,
        assetType: values.assetType,
        currentValue: Number(values.currentValue),
        investedAmount: values.investedAmount ? Number(values.investedAmount) : undefined,
        recordedDate: values.recordedDate,
        notes: values.notes || undefined,
      }

      if (isEditing && editAsset) {
        const res = await fetch(`/api/assets/${editAsset.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error ?? "Failed to update asset")
          return
        }
        toast.success("Asset updated successfully")
      } else {
        const res = await fetch("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error ?? "Failed to add asset")
          return
        }
        toast.success("Asset added successfully")
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
          <DialogTitle>{isEditing ? "Edit Asset" : "Add Asset"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="assetName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Groww MF, Vested, SBI PPF" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assetType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ASSET_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type} value={type}>
                          {ASSET_TYPE_LABELS[type]}
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
                name="currentValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Value (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="investedAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invested Amount (₹)</FormLabel>
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
              name="recordedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recorded Date</FormLabel>
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
                {isSubmitting ? "Saving..." : isEditing ? "Update" : "Add Asset"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
