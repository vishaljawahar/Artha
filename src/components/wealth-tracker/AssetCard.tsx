"use client"

import { Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
import { Button } from "@/components/ui/button"
import { Asset, ASSET_TYPE_COLORS, ASSET_TYPE_LABELS, formatINR } from "./types"

interface AssetCardProps {
  asset: Asset
  onEdit: (asset: Asset) => void
  onDelete: (id: string) => void
}

export function AssetCard({ asset, onEdit, onDelete }: AssetCardProps) {
  const currentValue = Number(asset.currentValue)
  const investedAmount = asset.investedAmount != null ? Number(asset.investedAmount) : null
  const gain = investedAmount != null ? currentValue - investedAmount : null
  const gainPct = investedAmount != null && investedAmount > 0
    ? ((currentValue - investedAmount) / investedAmount) * 100
    : null

  const color = ASSET_TYPE_COLORS[asset.assetType]
  const label = ASSET_TYPE_LABELS[asset.assetType]

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <Badge
          className="text-xs font-medium px-2 py-0.5 rounded-full border-0"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {label}
        </Badge>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-gray-700 hover:bg-gray-50"
            onClick={() => onEdit(asset)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Asset Record</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this record for{" "}
                  <strong>{asset.assetName}</strong>? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => onDelete(asset.id)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-gray-800 mb-2 truncate">{asset.assetName}</h3>
      <p className="text-xl font-bold text-gray-900 mb-1">{formatINR(currentValue)}</p>

      {investedAmount != null && (
        <div className="mt-2 space-y-0.5">
          <p className="text-xs text-gray-500">
            Invested: <span className="font-medium text-gray-700">{formatINR(investedAmount)}</span>
          </p>
          {gain != null && gainPct != null && (
            <div className={`flex items-center gap-1 text-xs font-medium ${gain >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {gain >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span>
                {gain >= 0 ? "+" : ""}{formatINR(gain)}{" "}
                ({gain >= 0 ? "+" : ""}{gainPct.toFixed(1)}%)
              </span>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        {new Date(asset.recordedDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </p>
    </div>
  )
}
