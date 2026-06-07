"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Pencil, Trash2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Loan, LOAN_TYPE_LABELS } from "@/components/loans/types"
import { AddLoanDialog } from "@/components/loans/AddLoanDialog"
import { LoanOverview } from "@/components/loans/LoanOverview"
import { PaymentsTab } from "@/components/loans/PaymentsTab"
import { EmiGrid } from "@/components/loans/EmiGrid"
import { DisbursementsTab } from "@/components/loans/DisbursementsTab"
import { MembersTab } from "@/components/loans/MembersTab"

export default function LoanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : ""

  const [loan, setLoan] = useState<Loan | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const fetchLoan = useCallback(async () => {
    if (!id) return
    try {
      const res = await fetch(`/api/loans/${id}`)
      if (!res.ok) {
        if (res.status === 404) {
          setNotFound(true)
        } else {
          toast.error("Failed to load loan")
        }
        setLoan(null)
        return
      }
      const data = await res.json()
      setLoan(data)
      setNotFound(false)
    } catch {
      toast.error("Failed to load loan")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchLoan()
  }, [fetchLoan])

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/loans/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error ?? "Delete failed")
        return
      }
      toast.success("Loan deleted")
      router.push("/loans")
    } catch {
      toast.error("Delete failed")
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 min-w-0">
        <Skeleton className="h-6 w-24 rounded-lg" />
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    )
  }

  if (notFound || !loan) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto min-w-0">
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-xl bg-background">
          <p className="text-4xl mb-4">🔍</p>
          <h2 className="text-lg font-semibold text-foreground mb-2">Loan not found</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            This loan doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Link href="/loans">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Loans
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const me = loan.members.find((m) => m.userId === loan.currentUserId)
  const isOwner = me?.role === "OWNER"

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 min-w-0">
      {/* Header */}
      <div className="space-y-3">
        <Link
          href="/loans"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Loans
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">{loan.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {loan.lender && (
                <span className="text-sm text-muted-foreground">{loan.lender}</span>
              )}
              <Badge className="text-xs font-medium px-2 py-0.5 rounded-full border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                {LOAN_TYPE_LABELS[loan.loanType]}
              </Badge>
            </div>
          </div>

          {isOwner && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Loan</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete <strong>{loan.name}</strong>? This will permanently remove
                      all payments, EMIs, disbursements, and member access. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={handleDelete}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="emis">EMIs</TabsTrigger>
          <TabsTrigger value="disbursements">Disbursements</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <LoanOverview loan={loan} />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PaymentsTab loan={loan} onChanged={fetchLoan} />
        </TabsContent>
        <TabsContent value="emis" className="mt-4">
          <EmiGrid loan={loan} onChanged={fetchLoan} />
        </TabsContent>
        <TabsContent value="disbursements" className="mt-4">
          <DisbursementsTab loan={loan} onChanged={fetchLoan} />
        </TabsContent>
        <TabsContent value="members" className="mt-4">
          <MembersTab loan={loan} onChanged={fetchLoan} isOwner={isOwner} />
        </TabsContent>
      </Tabs>

      <AddLoanDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={fetchLoan}
        editLoan={loan}
      />
    </div>
  )
}
