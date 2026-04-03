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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">Total Net Worth</p>
          <p className="text-3xl font-bold text-gray-900">{formatINR(netWorth)}</p>
          {lastUpdated && (
            <p className="text-sm text-gray-400 mt-1">
              Last updated: {formatDate(lastUpdated)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-gray-200 text-gray-700 hover:bg-gray-50"
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
