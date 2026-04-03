"use client"

import { useState, useEffect, useCallback } from "react"
import { Skeleton } from "@/components/ui/skeleton"
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
import { toast } from "sonner"

import { MonthHeader } from "@/components/monthly-log/MonthHeader"
import { SummaryStrip } from "@/components/monthly-log/SummaryStrip"
import { HeaderForm } from "@/components/monthly-log/HeaderForm"
import { TransactionGrouped } from "@/components/monthly-log/TransactionGrouped"
import { TransactionTimeline } from "@/components/monthly-log/TransactionTimeline"
import { AddTransactionDialog } from "@/components/monthly-log/AddTransactionDialog"
import { BulkEntryDialog } from "@/components/monthly-log/BulkEntryDialog"
import type { MonthlyHeader as MonthlyHeaderType, Category, Transaction } from "@/components/monthly-log/types"

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

export default function MonthlyLogPage() {
  const today = getToday()
  const [year, setYear] = useState(today.year)
  const [month, setMonth] = useState(today.month)
  const [view, setView] = useState<"grouped" | "timeline">("grouped")

  const [header, setHeader] = useState<MonthlyHeaderType | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(true)

  // Dialog states
  const [addOpen, setAddOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null)

  // Fetch header + categories
  const fetchMeta = useCallback(async () => {
    setLoadingMeta(true)
    try {
      const res = await fetch(`/api/monthly-log/${year}/${month}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setHeader(data.header)
      setCategories(data.categories)
    } catch {
      toast.error("Failed to load monthly data")
    } finally {
      setLoadingMeta(false)
    }
  }, [year, month])

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    setLoadingTransactions(true)
    try {
      const res = await fetch(`/api/transactions?year=${year}&month=${month}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setTransactions(data.transactions)
    } catch {
      toast.error("Failed to load transactions")
    } finally {
      setLoadingTransactions(false)
    }
  }, [year, month])

  useEffect(() => {
    fetchMeta()
    fetchTransactions()
  }, [fetchMeta, fetchTransactions])

  const handlePrev = () => {
    const p = prevMonth(year, month)
    setYear(p.year)
    setMonth(p.month)
  }

  const handleNext = () => {
    const n = nextMonth(year, month)
    setYear(n.year)
    setMonth(n.month)
  }

  const handleDelete = async () => {
    if (!deletingTransaction) return
    try {
      const res = await fetch(`/api/transactions/${deletingTransaction.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Failed to delete")
        return
      }
      toast.success("Transaction deleted")
      setDeletingTransaction(null)
      fetchTransactions()
    } catch {
      toast.error("Something went wrong")
    }
  }

  const totalExpenditure = transactions.reduce((sum, t) => sum + Number(t.amount), 0)
  const isLoading = loadingMeta || loadingTransactions

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      {/* Month navigation + controls */}
      <MonthHeader
        year={year}
        month={month}
        view={view}
        onPrev={handlePrev}
        onNext={handleNext}
        onViewChange={setView}
        onAdd={() => {
          setEditingTransaction(null)
          setAddOpen(true)
        }}
        onBulk={() => setBulkOpen(true)}
      />

      {/* Summary strip */}
      {loadingMeta ? (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SummaryStrip header={header} totalExpenditure={totalExpenditure} />
          </div>
          {header && (
            <HeaderForm
              year={year}
              month={month}
              header={header}
              onSaved={fetchMeta}
            />
          )}
        </div>
      )}

      {/* Monthly header form (inline, only when no header) */}
      {!loadingMeta && !header && (
        <HeaderForm
          year={year}
          month={month}
          header={null}
          onSaved={() => {
            fetchMeta()
          }}
        />
      )}

      {/* Transaction list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : view === "grouped" ? (
        <TransactionGrouped
          transactions={transactions}
          categories={categories}
          onEdit={(t) => {
            setEditingTransaction(t)
            setAddOpen(true)
          }}
          onDelete={(t) => setDeletingTransaction(t)}
        />
      ) : (
        <TransactionTimeline
          transactions={transactions}
          categories={categories}
          onEdit={(t) => {
            setEditingTransaction(t)
            setAddOpen(true)
          }}
          onDelete={(t) => setDeletingTransaction(t)}
        />
      )}

      {/* Add / Edit transaction dialog */}
      <AddTransactionDialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o)
          if (!o) setEditingTransaction(null)
        }}
        categories={categories}
        year={year}
        month={month}
        editingTransaction={editingTransaction}
        onSaved={fetchTransactions}
      />

      {/* Bulk entry dialog */}
      <BulkEntryDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        categories={categories}
        year={year}
        month={month}
        onSaved={fetchTransactions}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingTransaction}
        onOpenChange={(o) => { if (!o) setDeletingTransaction(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTransaction && (
                <>
                  This will permanently delete &ldquo;{deletingTransaction.description || "this transaction"}&rdquo;
                  {" "}for{" "}
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(Number(deletingTransaction.amount))}.
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingTransaction(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
