"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Pencil } from "lucide-react"
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
import { MonthlyHeader } from "./types"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

interface HeaderFormProps {
  year: number
  month: number
  header: MonthlyHeader | null
  onSaved: () => void
}

export function HeaderForm({ year, month, header, onSaved }: HeaderFormProps) {
  const [open, setOpen] = useState(false)
  const [income, setIncome] = useState(header ? String(header.income) : "")
  const [emiTotal, setEmiTotal] = useState(header ? String(header.emiTotal) : "")
  const [savings, setSavings] = useState(header ? String(header.savings) : "")
  const [loading, setLoading] = useState(false)

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`

  // Reset form when opening
  const handleOpen = () => {
    setIncome(header ? String(header.income) : "")
    setEmiTotal(header ? String(header.emiTotal) : "")
    setSavings(header ? String(header.savings) : "")
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const incomeNum = parseFloat(income)
    const emiNum = parseFloat(emiTotal)
    const savingsNum = parseFloat(savings)

    if (isNaN(incomeNum) || incomeNum < 0) {
      toast.error("Please enter a valid income amount")
      return
    }
    if (isNaN(emiNum) || emiNum < 0) {
      toast.error("Please enter a valid EMI amount")
      return
    }
    if (isNaN(savingsNum) || savingsNum < 0) {
      toast.error("Please enter a valid savings amount")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/monthly-log/${year}/${month}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ income: incomeNum, emiTotal: emiNum, savings: savingsNum }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Failed to save")
        return
      }

      toast.success(header ? "Monthly header updated" : "Monthly header saved")
      setOpen(false)
      onSaved()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  // Inline card if no header
  if (!header) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Set income &amp; savings for {monthLabel}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="income" className="text-xs text-gray-600">Income (₹)</Label>
              <Input
                id="income"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 80000"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className="border-gray-200"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emi" className="text-xs text-gray-600">EMI Total (₹)</Label>
              <Input
                id="emi"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 15000"
                value={emiTotal}
                onChange={(e) => setEmiTotal(e.target.value)}
                className="border-gray-200"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="savings" className="text-xs text-gray-600">Savings (₹)</Label>
              <Input
                id="savings"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 20000"
                value={savings}
                onChange={(e) => setSavings(e.target.value)}
                className="border-gray-200"
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </form>
      </div>
    )
  }

  // Edit button + dialog if header exists
  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-600 transition-colors"
        title="Edit monthly header"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {monthLabel}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-income" className="text-xs text-gray-600">Income (₹)</Label>
              <Input
                id="edit-income"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 80000"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className="border-gray-200"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-emi" className="text-xs text-gray-600">EMI Total (₹)</Label>
              <Input
                id="edit-emi"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 15000"
                value={emiTotal}
                onChange={(e) => setEmiTotal(e.target.value)}
                className="border-gray-200"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-savings" className="text-xs text-gray-600">Savings (₹)</Label>
              <Input
                id="edit-savings"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 20000"
                value={savings}
                onChange={(e) => setSavings(e.target.value)}
                className="border-gray-200"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
