"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { LoanCard } from "@/components/loans/LoanCard"
import { AddLoanDialog } from "@/components/loans/AddLoanDialog"
import { Loan } from "@/components/loans/types"

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)

  const fetchLoans = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/loans")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setLoans(data)
    } catch {
      toast.error("Failed to load loans")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLoans()
  }, [fetchLoans])

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-9 w-40 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (loans.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">Loans</h1>
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-xl bg-background">
          <p className="text-4xl mb-4">🏦</p>
          <h2 className="text-lg font-semibold text-foreground mb-2">No loans yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Track shared loans, contributions, and EMI payments across members — start by adding your first loan.
          </p>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add your first loan
          </Button>
        </div>

        <AddLoanDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          onSuccess={fetchLoans}
        />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Loans</h1>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Loan
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loans.map((loan) => (
          <LoanCard key={loan.id} loan={loan} />
        ))}
      </div>

      <AddLoanDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={fetchLoans}
      />
    </div>
  )
}
