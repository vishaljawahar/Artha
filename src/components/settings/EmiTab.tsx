"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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

interface EMI {
  id: string
  name: string
  amount: number
  startDate: string
  endDate: string | null
  isActive: boolean
}

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function monthsRemaining(startDate: string, endDate: string | null): string {
  if (!endDate) return "Open-ended"
  const end = new Date(endDate)
  const now = new Date()
  if (end <= now) return "Ended"
  const months =
    (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth())
  return `${months} mo remaining`
}

function toInputDate(dateStr: string): string {
  return dateStr.slice(0, 10)
}

const EMPTY_FORM = {
  name: "",
  amount: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  isActive: true,
}

export function EmiTab() {
  const [emis, setEmis] = useState<EMI[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editEmi, setEditEmi] = useState<EMI | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<EMI | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchEmis = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/settings/emis")
      if (!res.ok) throw new Error("Failed to load EMIs")
      const data = await res.json()
      setEmis(data.emis.map((e: EMI & { amount: number | string }) => ({ ...e, amount: Number(e.amount) })))
    } catch {
      toast.error("Failed to load EMIs")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEmis()
  }, [fetchEmis])

  const openAdd = () => {
    setEditEmi(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (emi: EMI) => {
    setEditEmi(emi)
    setForm({
      name: emi.name,
      amount: String(emi.amount),
      startDate: toInputDate(emi.startDate),
      endDate: emi.endDate ? toInputDate(emi.endDate) : "",
      isActive: emi.isActive,
    })
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const amountNum = parseFloat(form.amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Amount must be positive")
      return
    }
    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        amount: amountNum,
        startDate: form.startDate,
        endDate: form.endDate || null,
        isActive: form.isActive,
      }
      const url = editEmi ? `/api/settings/emis/${editEmi.id}` : "/api/settings/emis"
      const method = editEmi ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save EMI")
        return
      }
      toast.success(editEmi ? "EMI updated" : "EMI added")
      setDialogOpen(false)
      await fetchEmis()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (emi: EMI) => {
    try {
      const res = await fetch(`/api/settings/emis/${emi.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !emi.isActive }),
      })
      if (!res.ok) {
        toast.error("Failed to update EMI")
        return
      }
      await fetchEmis()
    } catch {
      toast.error("Something went wrong")
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/settings/emis/${deleteTarget.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete EMI")
        return
      }
      toast.success("EMI deleted")
      setDeleteTarget(null)
      await fetchEmis()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setDeleting(false)
    }
  }

  const displayed = showInactive ? emis : emis.filter((e) => e.isActive)

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-gray-700">
            {emis.filter((e) => e.isActive).length} active EMI{emis.filter((e) => e.isActive).length !== 1 ? "s" : ""}
          </h2>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
            <Switch
              checked={showInactive}
              onCheckedChange={setShowInactive}
              className="scale-75"
            />
            Show inactive
          </label>
        </div>
        <Button
          onClick={openAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add EMI
        </Button>
      </div>

      {/* EMI list */}
      <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
        {displayed.map((emi) => (
          <div
            key={emi.id}
            className={`flex items-center gap-4 px-4 py-3 bg-white ${!emi.isActive ? "opacity-50" : ""}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{emi.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatINR(emi.amount)}/mo &middot;{" "}
                {monthsRemaining(emi.startDate, emi.endDate)}
              </p>
            </div>
            <Switch
              checked={emi.isActive}
              onCheckedChange={() => handleToggleActive(emi)}
              className="scale-90"
            />
            <button
              onClick={() => openEdit(emi)}
              className="text-gray-400 hover:text-gray-600"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setDeleteTarget(emi)}
              className="text-gray-400 hover:text-red-600"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {displayed.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            {emis.length === 0 ? "No EMIs yet. Add one to get started." : "No active EMIs."}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editEmi ? "Edit EMI" : "Add EMI"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="emi-name" className="text-xs text-gray-600">Name</Label>
              <Input
                id="emi-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Car Loan EMI"
                className="border-gray-200"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emi-amount" className="text-xs text-gray-600">Amount (₹/month)</Label>
              <Input
                id="emi-amount"
                type="number"
                min="1"
                step="1"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="e.g. 15000"
                className="border-gray-200"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="emi-start" className="text-xs text-gray-600">Start Date</Label>
                <Input
                  id="emi-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="border-gray-200"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emi-end" className="text-xs text-gray-600">
                  End Date <span className="text-gray-400">(optional)</span>
                </Label>
                <Input
                  id="emi-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="border-gray-200"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="emi-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
              <Label htmlFor="emi-active" className="text-sm text-gray-700 cursor-pointer">
                Active
              </Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? "Saving..." : editEmi ? "Save Changes" : "Add EMI"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete EMI</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{deleteTarget?.name}</span>?
              This action cannot be undone.
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
