"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts"
import { Loan, memberColor, formatINR } from "./types"

interface ContributionChartProps {
  loan: Loan
}

interface ChartEntry {
  name: string
  value: number
  color: string
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: ChartEntry }[] }) => {
  if (active && payload && payload.length) {
    const entry = payload[0].payload
    return (
      <div className="bg-card border border-border rounded-lg shadow-md px-3 py-2">
        <p className="text-sm font-medium text-foreground">{entry.name}</p>
        <p className="text-sm text-muted-foreground">{formatINR(entry.value)}</p>
      </div>
    )
  }
  return null
}

export function ContributionChart({ loan }: ContributionChartProps) {
  const data: ChartEntry[] = loan.summary.contributions.byMember
    .map((m, i) => ({
      name: m.name,
      value: m.total,
      color: memberColor(i),
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border flex items-center justify-center h-[240px]">
        <p className="text-muted-foreground text-sm">No contributions yet</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-semibold text-foreground mb-4">Contributions by Member</h3>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-shrink-0 mx-auto sm:mx-0">
          <PieChart width={180} height={180}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} stroke="hsl(var(--card))" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full min-w-0 space-y-2">
          {data.map((entry) => {
            const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0"
            return (
              <div key={entry.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs text-muted-foreground truncate">{entry.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-medium text-foreground">{formatINR(entry.value)}</span>
                  <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
