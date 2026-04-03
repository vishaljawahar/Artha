"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Asset, ASSET_TYPE_LABELS, formatINR } from "./types"

interface UpdateSnapshotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentAssets: Asset[]
  onSuccess: () => void
}

interface SnapshotRow {
  assetName: string
  assetType: Asset["assetType"]
  prevValue: number
  investedAmount: number | null
  newValue: string
}

export function UpdateSnapshotDialog({
  open,
  onOpenChange,
  currentAssets,
  onSuccess,
}: UpdateSnapshotDialogProps) {
  const [rows, setRows] = useState<SnapshotRow[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setRows(
        currentAssets.map((a) => ({
          assetName: a.assetName,
          assetType: a.assetType,
          prevValue: Number(a.currentValue),
          investedAmount: a.investedAmount != null ? Number(a.investedAmount) : null,
          newValue: String(Number(a.currentValue)),
        }))
      )
    }
  }, [open, currentAssets])

  const todayStr = new Date().toISOString().split("T")[0]

  async function handleSubmit() {
    const changed = rows.filter((r) => {
      const newVal = Number(r.newValue)
      return !isNaN(newVal) && newVal !== r.prevValue
    })

    if (changed.length === 0) {
      toast.info("No values changed")
      onOpenChange(false)
      return
    }

    setSaving(true)
    try {
      await Promise.all(
        changed.map((r) =>
          fetch("/api/assets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              assetName: r.assetName,
              assetType: r.assetType,
              currentValue: Number(r.newValue),
              investedAmount: r.investedAmount ?? undefined,
              recordedDate: todayStr,
            }),
          })
        )
      )
      toast.success(`Snapshot updated for ${changed.length} asset${changed.length > 1 ? "s" : ""}`)
      onSuccess()
      onOpenChange(false)
    } catch {
      toast.error("Failed to update snapshot")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Snapshot</DialogTitle>
          <DialogDescription>
            Enter today's values. Only changed assets will create a new record.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No assets to update.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row, i) => (
              <div key={row.assetName} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{row.assetName}</p>
                  <p className="text-xs text-gray-400">{ASSET_TYPE_LABELS[row.assetType]}</p>
                </div>
                <div className="text-right text-xs text-gray-400 w-24 shrink-0">
                  <p>Prev: {formatINR(row.prevValue)}</p>
                </div>
                <Input
                  type="number"
                  min={0}
                  className="w-32 shrink-0 text-right"
                  value={row.newValue}
                  onChange={(e) => {
                    const updated = [...rows]
                    updated[i] = { ...updated[i], newValue: e.target.value }
                    setRows(updated)
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || rows.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? "Saving..." : "Save Snapshot"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
