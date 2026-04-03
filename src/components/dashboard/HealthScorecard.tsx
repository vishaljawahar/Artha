"use client"

import { Skeleton } from "@/components/ui/skeleton"

interface HealthMetric {
  label: string
  value: number
  /** 0 = green/healthy, 1 = amber/watch, 2 = red/high */
  tier: 0 | 1 | 2
  badgeLabel: string
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

const TIER_BADGE: Record<0 | 1 | 2, { label: string; classes: string }> = {
  0: { label: "Healthy", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  1: { label: "Watch", classes: "bg-amber-50 text-amber-700 border-amber-200" },
  2: { label: "High", classes: "bg-red-50 text-red-700 border-red-200" },
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
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
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
  loading?: boolean
}

export function HealthScorecard({ emiLoad, savingsRate, expenditureRate, loading }: HealthScorecardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <Skeleton className="h-5 w-44 mb-4" />
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
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
      badgeLabel: TIER_BADGE[getEmiTier(emiLoad)].label,
    },
    {
      label: "Savings Rate",
      value: savingsRate,
      tier: getSavingsTier(savingsRate),
      badgeLabel: TIER_BADGE[getSavingsTier(savingsRate)].label,
    },
    {
      label: "Expenditure-to-Net",
      value: expenditureRate,
      tier: getExpenditureTier(expenditureRate),
      badgeLabel: TIER_BADGE[getExpenditureTier(expenditureRate)].label,
    },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Financial Health</h3>
      <div className="space-y-5">
        {metrics.map((m) => {
          const badge = TIER_BADGE[m.tier]
          const progressColor = TIER_PROGRESS_COLOR[m.tier]
          return (
            <div key={m.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">{m.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">
                    {m.value.toFixed(1)}%
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badge.classes}`}
                  >
                    {badge.label}
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
