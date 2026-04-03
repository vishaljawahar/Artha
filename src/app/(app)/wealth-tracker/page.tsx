"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { NetWorthHeader } from "@/components/wealth-tracker/NetWorthHeader"
import { AllocationChart } from "@/components/wealth-tracker/AllocationChart"
import { TrendChart } from "@/components/wealth-tracker/TrendChart"
import { AssetCard } from "@/components/wealth-tracker/AssetCard"
import { AddAssetDialog } from "@/components/wealth-tracker/AddAssetDialog"
import { UpdateSnapshotDialog } from "@/components/wealth-tracker/UpdateSnapshotDialog"
import { Asset, computeCurrentPortfolio } from "@/components/wealth-tracker/types"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function WealthTrackerPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editAsset, setEditAsset] = useState<Asset | null>(null)
  const [snapshotOpen, setSnapshotOpen] = useState(false)

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/assets")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setAssets(data)
    } catch {
      toast.error("Failed to load assets")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error ?? "Delete failed")
        return
      }
      toast.success("Asset deleted")
      fetchAssets()
    } catch {
      toast.error("Delete failed")
    }
  }

  const currentPortfolio = computeCurrentPortfolio(assets)
  const netWorth = currentPortfolio.reduce((sum, a) => sum + Number(a.currentValue), 0)
  const lastUpdated = assets.length > 0
    ? assets.reduce((latest, a) =>
        a.recordedDate > latest ? a.recordedDate : latest, assets[0].recordedDate)
    : null

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (assets.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Wealth Tracker</h1>
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50">
          <p className="text-4xl mb-4">📈</p>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">No assets yet</h2>
          <p className="text-sm text-gray-400 mb-6 max-w-xs">
            Start tracking your portfolio by adding your first asset — PPF, stocks, mutual funds, gold, and more.
          </p>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add your first asset
          </Button>
        </div>

        <AddAssetDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          onSuccess={fetchAssets}
          editAsset={null}
        />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
      <NetWorthHeader
        netWorth={netWorth}
        lastUpdated={lastUpdated}
        onAddAsset={() => { setEditAsset(null); setAddOpen(true) }}
        onUpdateSnapshot={() => setSnapshotOpen(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AllocationChart currentAssets={currentPortfolio} />
        <TrendChart assets={assets} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Current Portfolio</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentPortfolio
            .sort((a, b) => Number(b.currentValue) - Number(a.currentValue))
            .map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onEdit={(a) => { setEditAsset(a); setAddOpen(true) }}
                onDelete={handleDelete}
              />
            ))}
        </div>
      </div>

      <AddAssetDialog
        open={addOpen}
        onOpenChange={(v) => { setAddOpen(v); if (!v) setEditAsset(null) }}
        onSuccess={fetchAssets}
        editAsset={editAsset}
      />

      <UpdateSnapshotDialog
        open={snapshotOpen}
        onOpenChange={setSnapshotOpen}
        currentAssets={currentPortfolio}
        onSuccess={fetchAssets}
      />
    </div>
  )
}
