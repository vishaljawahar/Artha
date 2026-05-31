"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface MonthlyBill {
  id: string
  name: string
  amount: number
  dueDay: number
  isActive: boolean
}

const EMPTY_FORM = {
  name: "",
  amount: "",
  dueDay: "1",
  isActive: true,
}

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function dueDayLabel(day: number) {
  if (day === 1 || day === 21 || day === 31) return `${day}st`
  if (day === 2 || day === 22) return `${day}nd`
  if (day === 3 || day === 23) return `${day}rd`
  return `${day}th`
}

export function MonthlyBillsTab() {
  const [bills, setBills] = useState<MonthlyBill[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editBill, setEditBill] = useState<MonthlyBill | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<MonthlyBill | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchBills = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/settings/monthly-bills")
      if (!res.ok) throw new Error("Failed to load monthly bills")
      const data = await res.json()
      setBills(data.bills.map((bill: MonthlyBill) => ({ ...bill, amount: Number(bill.amount) })))
    } catch {
      toast.error("Failed to load monthly bills")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBills()
  }, [fetchBills])

  const openAdd = () => {
    setEditBill(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (bill: MonthlyBill) => {
    setEditBill(bill)
    setForm({
      name: bill.name,
      amount: String(bill.amount),
      dueDay: String(bill.dueDay),
      isActive: bill.isActive,
    })
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    const dueDay = parseInt(form.dueDay, 10)

    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be positive")
      return
    }
    if (isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
      toast.error("Due day must be between 1 and 31")
      return
    }

    setSaving(true)
    try {
      const url = editBill ? `/api/settings/monthly-bills/${editBill.id}` : "/api/settings/monthly-bills"
      const method = editBill ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          amount,
          dueDay,
          isActive: form.isActive,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save bill")
        return
      }
      toast.success(editBill ? "Bill updated" : "Bill added")
      setDialogOpen(false)
      await fetchBills()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (bill: MonthlyBill) => {
    try {
      const res = await fetch(`/api/settings/monthly-bills/${bill.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !bill.isActive }),
      })
      if (!res.ok) {
        toast.error("Failed to update bill")
        return
      }
      await fetchBills()
    } catch {
      toast.error("Something went wrong")
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/settings/monthly-bills/${deleteTarget.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete bill")
        return
      }
      toast.success("Bill deleted")
      setDeleteTarget(null)
      await fetchBills()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setDeleting(false)
    }
  }

  const displayed = showInactive ? bills : bills.filter((bill) => bill.isActive)
  const activeCount = bills.filter((bill) => bill.isActive).length

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-md animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-medium text-gray-700">
            {activeCount} active bill{activeCount !== 1 ? "s" : ""}
          </h2>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} className="scale-75" />
            Show inactive
          </label>
        </div>
        <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Bill
        </Button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
        {displayed.map((bill) => (
          <div
            key={bill.id}
            className={`flex items-center gap-4 px-4 py-3 bg-white ${!bill.isActive ? "opacity-50" : ""}`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{bill.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Due {dueDayLabel(bill.dueDay)} &middot; {formatINR(bill.amount)}
              </p>
            </div>
            <Switch checked={bill.isActive} onCheckedChange={() => handleToggleActive(bill)} className="scale-90" />
            <button onClick={() => openEdit(bill)} className="text-gray-400 hover:text-gray-600" title="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setDeleteTarget(bill)} className="text-gray-400 hover:text-red-600" title="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {displayed.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            {bills.length === 0 ? "No bills yet. Add one to get started." : "No active bills."}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editBill ? "Edit Bill" : "Add Bill"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bill-name" className="text-xs text-gray-600">Name</Label>
              <Input
                id="bill-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Electricity bill"
                className="border-gray-200"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bill-amount" className="text-xs text-gray-600">Amount</Label>
                <Input
                  id="bill-amount"
                  type="number"
                  min="1"
                  step="1"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="2500"
                  className="border-gray-200"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bill-due-day" className="text-xs text-gray-600">Due Day</Label>
                <Input
                  id="bill-due-day"
                  type="number"
                  min="1"
                  max="31"
                  step="1"
                  value={form.dueDay}
                  onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value }))}
                  className="border-gray-200"
                  required
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="bill-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
              <Label htmlFor="bill-active" className="text-sm text-gray-700 cursor-pointer">
                Active
              </Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {saving ? "Saving..." : editBill ? "Save Changes" : "Add Bill"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-medium">{deleteTarget?.name}</span>?
              This also removes its saved monthly checklist history.
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
