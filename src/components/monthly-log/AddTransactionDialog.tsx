"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Category, Transaction } from "./types"

interface AddTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  year: number
  month: number
  editingTransaction?: Transaction | null
  onSaved: () => void
}

function toDateInputValue(dateStr: string): string {
  // dateStr may be ISO string like "2026-03-15T00:00:00.000Z"
  return dateStr.slice(0, 10)
}

function todayDateInputValue(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  categories,
  year,
  month,
  editingTransaction,
  onSaved,
}: AddTransactionDialogProps) {
  const isEdit = !!editingTransaction

  const [date, setDate] = useState(todayDateInputValue())
  const [categoryId, setCategoryId] = useState("")
  const [subcategory, setSubcategory] = useState("")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (editingTransaction) {
      setDate(toDateInputValue(editingTransaction.date))
      setCategoryId(editingTransaction.categoryId)
      setSubcategory(editingTransaction.subcategory ?? "")
      setDescription(editingTransaction.description)
      setAmount(String(editingTransaction.amount))
    } else {
      setDate(todayDateInputValue())
      setCategoryId("")
      setSubcategory("")
      setDescription("")
      setAmount("")
    }
  }, [editingTransaction, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryId) {
      toast.error("Please select a category")
      return
    }
    if (!description.trim()) {
      toast.error("Description is required")
      return
    }
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    setLoading(true)
    try {
      let res: Response
      if (isEdit) {
        res = await fetch(`/api/transactions/${editingTransaction!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            categoryId,
            subcategory: subcategory.trim() || undefined,
            description: description.trim(),
            amount: amountNum,
          }),
        })
      } else {
        res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            categoryId,
            subcategory: subcategory.trim() || undefined,
            description: description.trim(),
            amount: amountNum,
            year,
            month,
          }),
        })
      }

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Failed to save")
        return
      }

      toast.success(isEdit ? "Transaction updated" : "Transaction added")
      onOpenChange(false)
      onSaved()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="txn-date" className="text-xs text-gray-600">Date</Label>
              <Input
                id="txn-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border-gray-200"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txn-amount" className="text-xs text-gray-600">Amount (₹)</Label>
              <Input
                id="txn-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="e.g. 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border-gray-200"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="txn-category" className="text-xs text-gray-600">Category</Label>
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
            <Label htmlFor="txn-subcategory" className="text-xs text-gray-600">
              Subcategory <span className="text-gray-400">(optional)</span>
            </Label>
            <Input
              id="txn-subcategory"
              type="text"
              placeholder="e.g. Fuel, Medicines"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="border-gray-200"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="txn-description" className="text-xs text-gray-600">Description</Label>
            <Input
              id="txn-description"
              type="text"
              placeholder="e.g. Car wash, Grocery run"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-gray-200"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
