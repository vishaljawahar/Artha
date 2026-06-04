"use client"

import { Skeleton } from "@/components/ui/skeleton"

interface HealthMetric {
  label: string
  value: number
  /** 0 = green/healthy, 1 = amber/watch, 2 = red/bad */
  tier: 0 | 1 | 2
  /** [tier0Label, tier1Label, tier2Label] */
  tierLabels: [string, string, string]
}

function getEmiTier(v: number): 0 | 1 | 2 {
  if (v < 30) return 0
  if (v <= 50) return 1
  return 2
}

function getSavingsTier(v: number): 0 | 1 | 2 {
  if (v >= 40) return 0
  if (v >= 20) return 1
  return 2
}

function getExpenditureTier(v: number): 0 | 1 | 2 {
  if (v < 80) return 0
  if (v <= 100) return 1
  return 2
}

function getSurplusTier(v: number): 0 | 1 | 2 {
  if (v >= 15) return 0
  if (v >= 5) return 1
  return 2
}

const TIER_BADGE_CLASSES: Record<0 | 1 | 2, string> = {
  0: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
  1: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  2: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
}

const TIER_PROGRESS_COLOR: Record<0 | 1 | 2, string> = {
  0: "#10B981",
  1: "#F59E0B",
  2: "#F43F5E",
}

interface ProgressBarProps {
  value: number
  color: string
}

function ColoredProgress({ value, color }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mt-2">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${clamped}%`, background: color }}
      />
    </div>
  )
}

interface HealthScorecardProps {
  emiLoad: number
  savingsRate: number
  expenditureRate: number
  surplusRate: number
  loading?: boolean
}

export function HealthScorecard({ emiLoad, savingsRate, expenditureRate, surplusRate, loading }: HealthScorecardProps) {
  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <Skeleton className="h-5 w-44 mb-4" />
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const metrics: HealthMetric[] = [
    {
      label: "EMI-to-Income",
      value: emiLoad,
      tier: getEmiTier(emiLoad),
      tierLabels: ["Healthy", "Watch", "High"],
    },
    {
      label: "Savings Rate",
      value: savingsRate,
      tier: getSavingsTier(savingsRate),
      tierLabels: ["Healthy", "Watch", "Low"],
    },
    {
      label: "Expenditure-to-Net",
      value: expenditureRate,
      tier: getExpenditureTier(expenditureRate),
      tierLabels: ["Healthy", "Watch", "High"],
    },
    {
      label: "Surplus Rate",
      value: surplusRate,
      tier: getSurplusTier(surplusRate),
      tierLabels: ["Healthy", "Watch", "Low"],
    },
  ]

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">Financial Health</h3>
      <div className="space-y-5">
        {metrics.map((m) => {
          const badgeLabel = m.tierLabels[m.tier]
          const badgeClasses = TIER_BADGE_CLASSES[m.tier]
          const progressColor = TIER_PROGRESS_COLOR[m.tier]
          return (
            <div key={m.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">{m.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">
                    {m.value.toFixed(1)}%
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badgeClasses}`}
                  >
                    {badgeLabel}
                  </span>
                </div>
              </div>
              <ColoredProgress value={Math.min(m.value, 100)} color={progressColor} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
