"use client"

import { Progress } from "@/components/ui/progress"
import { Loan, formatINR } from "./types"
import { ContributionChart } from "./ContributionChart"
import { EmiPlannedVsActualChart } from "./EmiPlannedVsActualChart"

interface LoanOverviewProps {
  loan: Loan
}

export function LoanOverview({ loan }: LoanOverviewProps) {
  const { progress, contributions } = loan.summary
  const disbursedPct = Math.min(100, Math.max(0, progress.disbursedPct))

  // This month planned vs paid
  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1
  let thisMonthPlanned = 0
  let thisMonthPaid = 0
  for (const e of loan.emiEntries) {
    if (e.year === curYear && e.month === curMonth) {
      thisMonthPlanned += Number(e.plannedShare)
      thisMonthPaid += e.actualPaid != null ? Number(e.actualPaid) : 0
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Contributed */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground mb-1">Total Contributed</p>
          <p className="text-2xl font-bold text-foreground">{formatINR(progress.totalContributed)}</p>
          {contributions.byMember.length > 0 && (
            <div className="mt-3 space-y-1">
              {contributions.byMember.map((m) => (
                <div key={m.userId} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground truncate">{m.name}</span>
                  <span className="text-xs font-medium text-foreground flex-shrink-0">{formatINR(m.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Disbursed vs Sanctioned */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground mb-1">Disbursed vs Sanctioned</p>
          <p className="text-2xl font-bold text-foreground">
            {formatINR(progress.disbursed)}
            <span className="text-sm font-normal text-muted-foreground"> / {formatINR(progress.sanctioned)}</span>
          </p>
          <div className="mt-3">
            <Progress value={disbursedPct} className="h-2 [&>div]:bg-emerald-600" />
            <p className="text-xs text-muted-foreground mt-1">{disbursedPct.toFixed(0)}% disbursed</p>
          </div>
        </div>

        {/* EMIs Paid */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground mb-1">EMIs Paid</p>
          <p className="text-2xl font-bold text-foreground">{formatINR(progress.emiPaidTotal)}</p>
        </div>

        {/* This month */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground mb-1">
            This Month ({now.toLocaleDateString("en-IN", { month: "short", year: "numeric" })})
          </p>
          <p className="text-2xl font-bold text-foreground">
            {formatINR(thisMonthPaid)}
            <span className="text-sm font-normal text-muted-foreground"> / {formatINR(thisMonthPlanned)}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">Paid / Planned</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="min-w-0">
          <ContributionChart loan={loan} />
        </div>
        <div className="min-w-0">
          <EmiPlannedVsActualChart loan={loan} />
        </div>
      </div>
    </div>
  )
}
