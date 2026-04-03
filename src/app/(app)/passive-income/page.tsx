"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Skeleton } from "@/components/ui/skeleton"

import { YearNav } from "@/components/passive-income/YearNav"
import { BondInterestTable } from "@/components/passive-income/BondInterestTable"
import { SimpleIncomeList } from "@/components/passive-income/SimpleIncomeList"
import { DividendList } from "@/components/passive-income/DividendList"
import { AddEditDialog } from "@/components/passive-income/AddEditDialog"
import type { PassiveIncomeEntry } from "@/components/passive-income/BondInterestTable"

export default function PassiveIncomePage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [entries, setEntries] = useState<PassiveIncomeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<PassiveIncomeEntry | null>(null)
  const [saving, setSaving] = useState(false)

  // Delete state
  const [deleteEntry, setDeleteEntry] = useState<PassiveIncomeEntry | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/passive-income?year=${year}`)
      if (!res.ok) throw new Error("Failed to load entries")
      const data = await res.json()
      setEntries(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const total = entries.reduce((s, e) => s + Number(e.amount), 0)

  const bondEntries = entries.filter((e) => e.sourceType === "BOND_INTEREST")
  const sbEntries = entries.filter((e) => e.sourceType === "SB_INTEREST")
  const dividendEntries = entries.filter((e) => e.sourceType === "DIVIDEND")
  const otherEntries = entries.filter(
    (e) => e.sourceType === "PROFIT" || e.sourceType === "OTHER"
  )

  const handleOpenAdd = () => {
    setEditEntry(null)
    setDialogOpen(true)
  }

  const handleOpenEdit = (entry: PassiveIncomeEntry) => {
    setEditEntry(entry)
    setDialogOpen(true)
  }

  const handleOpenDelete = (entry: PassiveIncomeEntry) => {
    setDeleteEntry(entry)
  }

  const handleSave = async (data: {
    id?: string
    sourceType: string
    sourceName: string
    year: number
    month?: string
    amount: number
    receivedDate?: string
    notes?: string
  }) => {
    setSaving(true)
    try {
      const body = {
        sourceType: data.sourceType,
        sourceName: data.sourceName,
        year: data.year,
        month: data.month ? parseInt(data.month, 10) : undefined,
        amount: data.amount,
        receivedDate: data.receivedDate || undefined,
        notes: data.notes || undefined,
      }

      let res: Response
      if (data.id) {
        res = await fetch(`/api/passive-income/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch("/api/passive-income", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to save")
      }

      toast.success(data.id ? "Entry updated" : "Entry added")
      setDialogOpen(false)
      await fetchEntries()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteEntry) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/passive-income/${deleteEntry.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to delete")
      }
      toast.success("Entry deleted")
      setDeleteEntry(null)
      await fetchEntries()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">Passive Income</h1>
          <YearNav
            year={year}
            total={total}
            onPrev={() => setYear((y) => y - 1)}
            onNext={() => setYear((y) => y + 1)}
          />
        </div>
        <Button
          onClick={handleOpenAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
          {error} —{" "}
          <button
            className="underline font-medium"
            onClick={fetchEntries}
          >
            Retry
          </button>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="bond">
        <TabsList className="mb-4">
          <TabsTrigger value="bond">
            Bond Interest
            {bondEntries.length > 0 && (
              <span className="ml-1.5 text-xs bg-emerald-100 text-emerald-700 rounded-full px-1.5">
                {bondEntries.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sb">
            SB Interest
            {sbEntries.length > 0 && (
              <span className="ml-1.5 text-xs bg-emerald-100 text-emerald-700 rounded-full px-1.5">
                {sbEntries.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="dividends">
            Dividends
            {dividendEntries.length > 0 && (
              <span className="ml-1.5 text-xs bg-emerald-100 text-emerald-700 rounded-full px-1.5">
                {dividendEntries.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="other">
            Other
            {otherEntries.length > 0 && (
              <span className="ml-1.5 text-xs bg-emerald-100 text-emerald-700 rounded-full px-1.5">
                {otherEntries.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Bond Interest */}
        <TabsContent value="bond">
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <BondInterestTable
              entries={bondEntries}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
            />
          )}
        </TabsContent>

        {/* SB Interest */}
        <TabsContent value="sb">
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <SimpleIncomeList
              entries={sbEntries}
              groupBy="sourceName"
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
              emptyMessage="No SB interest entries for this year."
            />
          )}
        </TabsContent>

        {/* Dividends */}
        <TabsContent value="dividends">
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <DividendList
              entries={dividendEntries}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
            />
          )}
        </TabsContent>

        {/* Other */}
        <TabsContent value="other">
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <SimpleIncomeList
              entries={otherEntries}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
              emptyMessage="No other income entries for this year."
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <AddEditDialog
        open={dialogOpen}
        entry={editEntry}
        defaultYear={year}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        saving={saving}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteEntry}
        onOpenChange={(v) => !v && setDeleteEntry(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this entry?{" "}
              {deleteEntry && (
                <span className="font-medium">
                  {deleteEntry.sourceName} —{" "}
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(Number(deleteEntry.amount))}
                </span>
              )}
              {" "}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-md" />
      ))}
    </div>
  )
}
