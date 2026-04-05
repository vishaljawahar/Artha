"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { Check, ChevronDown } from "lucide-react"
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
import { cn } from "@/lib/utils"
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
  const [categorySearch, setCategorySearch] = useState("")
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [subcategory, setSubcategory] = useState("")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const categoryRef = useRef<HTMLDivElement>(null)

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
      setCategorySearch("")
      setCategoryOpen(false)
      setSubcategory("")
      setDescription("")
      setAmount("")
    }
  }, [editingTransaction, open])

  useEffect(() => {
    if (!categoryOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [categoryOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryId) {
      toast.error("Please select a category")
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          <div className="space-y-1.5" ref={categoryRef}>
            <Label className="text-xs text-gray-600">Category</Label>
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCategoryOpen((v) => !v)
                  setCategorySearch("")
                }}
                className="w-full justify-between border-gray-200 font-normal text-sm h-9"
              >
                {categoryId ? (
                  (() => {
                    const cat = categories.find((c) => c.id === categoryId)
                    return cat ? (
                      <span className="flex items-center gap-2">
                        {cat.icon && <span>{cat.icon}</span>}
                        {cat.name}
                      </span>
                    ) : "Select category..."
                  })()
                ) : (
                  <span className="text-gray-400">Select category...</span>
                )}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>

              {categoryOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                  <div className="p-2 border-b border-gray-100">
                    <Input
                      autoFocus
                      placeholder="Search category..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="h-8 text-sm border-gray-200"
                    />
                  </div>
                  <div className="overflow-y-scroll max-h-48">
                    {categories
                      .filter((cat) =>
                        cat.name.toLowerCase().includes(categorySearch.toLowerCase())
                      )
                      .map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setCategoryId(cat.id)
                            setCategoryOpen(false)
                            setCategorySearch("")
                          }}
                          className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-gray-50 text-left"
                        >
                          <span className="flex items-center gap-2">
                            {cat.icon && <span>{cat.icon}</span>}
                            {cat.name}
                          </span>
                          {categoryId === cat.id && (
                            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                          )}
                        </button>
                      ))}
                    {categories.filter((cat) =>
                      cat.name.toLowerCase().includes(categorySearch.toLowerCase())
                    ).length === 0 && (
                      <p className="px-3 py-4 text-sm text-gray-400 text-center">
                        No category found.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
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
            <Label htmlFor="txn-description" className="text-xs text-gray-600">
              Description <span className="text-gray-400">(optional)</span>
            </Label>
            <Input
              id="txn-description"
              type="text"
              placeholder="e.g. Car wash, Grocery run"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-gray-200"
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
