"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Plus, Trash2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface Category {
  id: string
  name: string
  icon: string | null
}

interface BudgetTarget {
  id: string
  categoryId: string
  year: number
  targetAmount: number
  category: Category
}

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function BudgetTargetsTab() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [targets, setTargets] = useState<BudgetTarget[]>([])
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Inline editing
  const [editId, setEditId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  // Add target dialog
  const [addOpen, setAddOpen] = useState(false)
  const [addCategoryId, setAddCategoryId] = useState("")
  const [addAmount, setAddAmount] = useState("")
  const [addSaving, setAddSaving] = useState(false)

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<BudgetTarget | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [targetsRes, catsRes] = await Promise.all([
        fetch(`/api/settings/budget-targets?year=${year}`),
        fetch("/api/settings/categories"),
      ])
      if (!targetsRes.ok || !catsRes.ok) throw new Error("Failed to load data")
      const targetsData = await targetsRes.json()
      const catsData = await catsRes.json()
      setTargets(targetsData.targets)
      setAllCategories(catsData.categories)
    } catch {
      toast.error("Failed to load budget targets")
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Categories without an existing target this year
  const targetedCatIds = new Set(targets.map((t) => t.categoryId))
  const availableCategories = allCategories.filter((c) => !targetedCatIds.has(c.id))

  const startEdit = (target: BudgetTarget) => {
    setEditId(target.id)
    setEditAmount(String(target.targetAmount))
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditAmount("")
  }

  const handleSaveEdit = async (id: string) => {
    const amount = parseFloat(editAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be positive")
      return
    }
    setEditSaving(true)
    try {
      const res = await fetch(`/api/settings/budget-targets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetAmount: amount }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update target")
        return
      }
      toast.success("Target updated")
      setEditId(null)
      await fetchData()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setEditSaving(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(addAmount)
    if (!addCategoryId) {
      toast.error("Please select a category")
      return
    }
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be positive")
      return
    }
    setAddSaving(true)
    try {
      const res = await fetch("/api/settings/budget-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: addCategoryId, year, targetAmount: amount }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to add target")
        return
      }
      toast.success("Budget target added")
      setAddOpen(false)
      setAddCategoryId("")
      setAddAmount("")
      await fetchData()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setAddSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/settings/budget-targets/${deleteTarget.id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete target")
        return
      }
      toast.success("Target deleted")
      setDeleteTarget(null)
      await fetchData()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Year nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-gray-800 w-12 text-center">{year}</span>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {availableCategories.length > 0 && (
          <Button
            onClick={() => setAddOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Target
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-md animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
          {targets.map((target) => (
            <div key={target.id} className="flex items-center gap-4 px-4 py-3 bg-white hover:bg-gray-50">
              <span className="text-xl w-7 text-center">{target.category.icon ?? "📦"}</span>
              <span className="flex-1 text-sm font-medium text-gray-800">{target.category.name}</span>

              {editId === target.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">₹</span>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-28 border-gray-200 h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(target.id)
                      if (e.key === "Escape") cancelEdit()
                    }}
                  />
                  <button
                    onClick={() => handleSaveEdit(target.id)}
                    disabled={editSaving}
                    className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => startEdit(target)}
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium tabular-nums"
                    title="Click to edit"
                  >
                    {formatINR(target.targetAmount)}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(target)}
                    className="text-gray-400 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {targets.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No budget targets for {year}. Click &ldquo;Add Target&rdquo; to get started.
            </div>
          )}
        </div>
      )}

      {/* Add Target Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Budget Target — {year}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Category</Label>
              <select
                value={addCategoryId}
                onChange={(e) => setAddCategoryId(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="">Select category...</option>
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon ? `${c.icon} ` : ""}{c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-budget-amount" className="text-xs text-gray-600">
                Annual Target Amount (₹)
              </Label>
              <Input
                id="add-budget-amount"
                type="number"
                min="1"
                step="1"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="border-gray-200"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {addSaving ? "Adding..." : "Add Target"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget Target</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the target for{" "}
              <span className="font-medium">{deleteTarget?.category.name}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
