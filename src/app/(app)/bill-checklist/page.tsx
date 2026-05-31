"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { CalendarCheck2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

interface ChecklistItem {
  id: string
  name: string
  amount: number
  dueDay: number
  isPaid: boolean
  paidAt: string | null
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function getToday() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

function prevMonth(year: number, month: number) {
  if (month === 1) return { year: year - 1, month: 12 }
  return { year, month: month - 1 }
}

function nextMonth(year: number, month: number) {
  if (month === 12) return { year: year + 1, month: 1 }
  return { year, month: month + 1 }
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

export default function BillChecklistPage() {
  const today = getToday()
  const [year, setYear] = useState(today.year)
  const [month, setMonth] = useState(today.month)
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const fetchChecklist = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/bill-checklist?year=${year}&month=${month}`)
      if (!res.ok) throw new Error("Failed to load checklist")
      const data = await res.json()
      setItems(data.items.map((item: ChecklistItem) => ({ ...item, amount: Number(item.amount) })))
    } catch {
      toast.error("Failed to load bill checklist")
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    fetchChecklist()
  }, [fetchChecklist])

  const handlePrev = () => {
    const prev = prevMonth(year, month)
    setYear(prev.year)
    setMonth(prev.month)
  }

  const handleNext = () => {
    const next = nextMonth(year, month)
    setYear(next.year)
    setMonth(next.month)
  }

  const handleToggle = async (item: ChecklistItem, isPaid: boolean) => {
    const previous = items
    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, isPaid } : entry)))
    setSavingId(item.id)
    try {
      const res = await fetch(`/api/bill-checklist/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, isPaid }),
      })
      const data = await res.json()
      if (!res.ok) {
        setItems(previous)
        toast.error(data.error ?? "Failed to update bill")
        return
      }
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, isPaid: data.payment.isPaid, paidAt: data.payment.paidAt }
            : entry
        )
      )
    } catch {
      setItems(previous)
      toast.error("Something went wrong")
    } finally {
      setSavingId(null)
    }
  }

  const paidItems = items.filter((item) => item.isPaid)
  const unpaidItems = items.filter((item) => !item.isPaid)
  const expectedTotal = items.reduce((sum, item) => sum + item.amount, 0)
  const paidTotal = paidItems.reduce((sum, item) => sum + item.amount, 0)
  const progress = items.length === 0 ? 0 : Math.round((paidItems.length / items.length) * 100)

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bill Checklist</h1>
          <p className="text-sm text-gray-500 mt-1">Track monthly bills before they slip past you.</p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <button onClick={handlePrev} className="p-2 rounded-md hover:bg-gray-100 text-gray-500" title="Previous month">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-[150px] text-center">
            <p className="text-sm font-semibold text-gray-900">{MONTH_NAMES[month - 1]} {year}</p>
            <p className="text-xs text-gray-500">{progress}% paid</p>
          </div>
          <button onClick={handleNext} className="p-2 rounded-md hover:bg-gray-100 text-gray-500" title="Next month">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-gray-500">Paid</p>
          <p className="text-xl font-semibold text-emerald-700 mt-1">{paidItems.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-gray-500">Unpaid</p>
          <p className="text-xl font-semibold text-gray-900 mt-1">{unpaidItems.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-gray-500">Expected</p>
          <p className="text-xl font-semibold text-gray-900 mt-1">{formatINR(expectedTotal)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-gray-500">Paid Total</p>
          <p className="text-xl font-semibold text-emerald-700 mt-1">{formatINR(paidTotal)}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-md animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white divide-y divide-gray-100">
          {items.map((item) => (
            <label
              key={item.id}
              className={`flex items-center gap-4 px-4 py-4 transition-colors hover:bg-gray-50 ${
                item.isPaid ? "bg-emerald-50/40" : "bg-white"
              }`}
            >
              <Checkbox
                checked={item.isPaid}
                disabled={savingId === item.id}
                onCheckedChange={(checked) => handleToggle(item, checked === true)}
                className="h-5 w-5 border-gray-300 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className={`text-sm font-medium truncate ${item.isPaid ? "text-gray-500 line-through" : "text-gray-900"}`}>
                    {item.name}
                  </p>
                  <p className="text-sm font-semibold text-gray-900">{formatINR(item.amount)}</p>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                  <span>Due {dueDayLabel(item.dueDay)}</span>
                  {item.paidAt && (
                    <span>Paid {new Date(item.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                  )}
                </div>
              </div>
            </label>
          ))}
          {items.length === 0 && (
            <div className="px-4 py-12 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <CalendarCheck2 className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-gray-900">No active bills yet</p>
              <p className="text-sm text-gray-500 mt-1">Add checklist items from Settings to start tracking this month.</p>
              <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
                <Link href="/settings">Open Settings</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
