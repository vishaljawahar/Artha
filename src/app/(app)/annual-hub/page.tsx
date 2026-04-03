"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { YearNav } from "@/components/annual-hub/YearNav"
import { EntrySection, type AnnualEntry } from "@/components/annual-hub/EntrySection"
import { AddEditDialog } from "@/components/annual-hub/AddEditDialog"
import { cn } from "@/lib/utils"

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-[140px] w-full rounded-xl" />
      <Skeleton className="h-[140px] w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  )
}

export default function AnnualHubPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [entries, setEntries] = useState<AnnualEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<AnnualEntry | null>(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/annual-entries?year=${year}`)
      if (!res.ok) throw new Error("Failed to fetch entries")
      const data = await res.json()
      // Normalize: convert amount to number
      const normalized: AnnualEntry[] = (data.entries as AnnualEntry[]).map((e) => ({
        ...e,
        amount: Number(e.amount),
      }))
      setEntries(normalized)
    } catch {
      toast.error("Failed to load entries")
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/annual-entries/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Delete failed")
        return
      }
      toast.success("Entry deleted")
      fetchEntries()
    } catch {
      toast.error("Delete failed")
    }
  }

  const handleEdit = (entry: AnnualEntry) => {
    setEditEntry(entry)
    setDialogOpen(true)
  }

  const handleAddNew = () => {
    setEditEntry(null)
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditEntry(null)
  }

  // Derived data
  const assets = entries.filter((e) => e.entryType === "ASSET")
  const liabilities = entries.filter((e) => e.entryType === "LIABILITY")

  const totalAssets = assets.reduce((sum, e) => sum + Number(e.amount), 0)
  const totalLiabilities = liabilities.reduce((sum, e) => sum + Number(e.amount), 0)
  const net = totalAssets - totalLiabilities

  // Unique category names for datalist suggestions
  const categoryOptions = Array.from(new Set(entries.map((e) => e.category))).sort()

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Annual Hub</h1>
        <div className="flex items-center gap-3">
          <YearNav
            year={year}
            onPrev={() => setYear((y) => y - 1)}
            onNext={() => setYear((y) => y + 1)}
          />
          <Button
            onClick={handleAddNew}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Main content */}
      {loading ? (
        <PageSkeleton />
      ) : (
        <>
          {/* Assets section */}
          <EntrySection
            title="Assets Deployed"
            entryType="ASSET"
            entries={assets}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          {/* Liabilities section */}
          <EntrySection
            title="Liabilities & Large Expenses"
            entryType="LIABILITY"
            entries={liabilities}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          {/* Net summary */}
          <div
            className={cn(
              "flex items-center justify-between px-5 py-4 rounded-xl border font-semibold",
              net > 0
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : net < 0
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-gray-50 border-gray-200 text-gray-600"
            )}
          >
            <span className="text-sm">Net (Assets − Liabilities)</span>
            <span className="text-lg">
              {net >= 0 ? "" : "−"}
              {formatINR(Math.abs(net))}
            </span>
          </div>
        </>
      )}

      {/* Add / Edit Dialog */}
      <AddEditDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSuccess={fetchEntries}
        year={year}
        editEntry={editEntry}
        categoryOptions={categoryOptions}
      />
    </div>
  )
}
