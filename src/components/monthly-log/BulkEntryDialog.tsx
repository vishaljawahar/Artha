"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Category } from "./types"

interface BulkEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  year: number
  month: number
  onSaved: () => void
}

export function BulkEntryDialog({
  open,
  onOpenChange,
  categories,
  year,
  month,
  onSaved,
}: BulkEntryDialogProps) {
  const [categoryId, setCategoryId] = useState("")
  const [lines, setLines] = useState("")
  const [loading, setLoading] = useState(false)

  const handleClose = () => {
    setCategoryId("")
    setLines("")
    onOpenChange(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryId) {
      toast.error("Please select a category")
      return
    }
    if (!lines.trim()) {
      toast.error("Please enter at least one line")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/transactions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: lines.trim(), categoryId, year, month }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Failed to save")
        return
      }

      const data = await res.json()
      toast.success(`${data.count} transaction${data.count !== 1 ? "s" : ""} added`)
      handleClose()
      onSaved()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Entry</DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Enter one transaction per line. Format: <code className="bg-gray-100 px-1 rounded">500 Car wash</code> or just <code className="bg-gray-100 px-1 rounded">800</code> for amount only.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-category" className="text-xs text-gray-600">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="border-gray-200">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      {cat.icon && <span>{cat.icon}</span>}
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bulk-lines" className="text-xs text-gray-600">Transactions</Label>
            <Textarea
              id="bulk-lines"
              placeholder={"500 Car wash\n1200 Grocery\n800"}
              value={lines}
              onChange={(e) => setLines(e.target.value)}
              className="border-gray-200 min-h-[140px] font-mono text-sm"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? "Adding..." : "Add All"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
