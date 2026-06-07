"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loan, LOAN_TYPE_LABELS, formatINR } from "./types"

interface LoanCardProps {
  loan: Loan
}

export function LoanCard({ loan }: LoanCardProps) {
  const { progress } = loan.summary
  const disbursedPct = Math.min(100, Math.max(0, progress.disbursedPct))
  const memberNames = loan.members.map((m) => m.user.name).join(", ")

  return (
    <Link
      href={`/loans/${loan.id}`}
      className="block bg-card rounded-xl border border-border shadow-sm p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">{loan.name}</h3>
          {loan.lender && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{loan.lender}</p>
          )}
        </div>
        <Badge
          className="text-xs font-medium px-2 py-0.5 rounded-full border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 shrink-0"
        >
          {LOAN_TYPE_LABELS[loan.loanType]}
        </Badge>
      </div>

      <p className="text-xl font-bold text-foreground mb-1">
        {formatINR(progress.sanctioned)}
      </p>
      <p className="text-xs text-muted-foreground mb-3">Sanctioned</p>

      <div className="space-y-1.5 mb-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Disbursed</span>
          <span className="font-medium text-foreground">{disbursedPct.toFixed(0)}%</span>
        </div>
        <Progress value={disbursedPct} className="h-2 [&>div]:bg-emerald-600" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatINR(progress.disbursed)}</span>
          <span>{formatINR(progress.sanctioned)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Total contributed</span>
        <span className="font-medium text-foreground">{formatINR(progress.totalContributed)}</span>
      </div>

      {memberNames && (
        <p className="text-xs text-muted-foreground mt-3 truncate">
          {memberNames}
        </p>
      )}
    </Link>
  )
}
