"use client"

import { Button } from "@/components/ui/button"
import { Plus, RefreshCw } from "lucide-react"
import { formatINR, formatDate } from "./types"

interface NetWorthHeaderProps {
  netWorth: number
  lastUpdated: string | null
  onAddAsset: () => void
  onUpdateSnapshot: () => void
}

export function NetWorthHeader({
  netWorth,
  lastUpdated,
  onAddAsset,
  onUpdateSnapshot,
}: NetWorthHeaderProps) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Total Net Worth</p>
          <p className="text-3xl font-bold text-foreground">{formatINR(netWorth)}</p>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground mt-1">
              Last updated: {formatDate(lastUpdated)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onUpdateSnapshot}
          >
            <RefreshCw className="h-4 w-4" />
            Update Snapshot
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onAddAsset}
          >
            <Plus className="h-4 w-4" />
            Add Asset
          </Button>
        </div>
      </div>
    </div>
  )
}
