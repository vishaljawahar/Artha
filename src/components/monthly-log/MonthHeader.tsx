"use client"

import { ChevronLeft, ChevronRight, Plus, AlignJustify, Clock, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

interface MonthHeaderProps {
  year: number
  month: number
  view: "grouped" | "timeline"
  onPrev: () => void
  onNext: () => void
  onViewChange: (v: "grouped" | "timeline") => void
  onAdd: () => void
  onBulk: () => void
  onExport: () => void
}

export function MonthHeader({
  year,
  month,
  view,
  onPrev,
  onNext,
  onViewChange,
  onAdd,
  onBulk,
  onExport,
}: MonthHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      {/* Month navigation */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onPrev} className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-base font-semibold text-gray-900 min-w-[130px] text-center">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <Button variant="ghost" size="icon" onClick={onNext} className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2">
        {/* View toggle */}
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => onViewChange("grouped")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
              view === "grouped"
                ? "bg-emerald-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            <AlignJustify className="h-3.5 w-3.5" />
            Grouped
          </button>
          <button
            onClick={() => onViewChange("timeline")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
              view === "timeline"
                ? "bg-emerald-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            Timeline
          </button>
        </div>

        {/* Export PDF */}
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="text-xs border-gray-200 text-gray-600 hover:text-gray-900 gap-1"
        >
          <Download className="h-3.5 w-3.5" />
          PDF
        </Button>

        {/* Bulk add */}
        <Button
          variant="outline"
          size="sm"
          onClick={onBulk}
          className="text-xs border-gray-200 text-gray-600 hover:text-gray-900"
        >
          Bulk
        </Button>

        {/* Add transaction */}
        <Button
          size="sm"
          onClick={onAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
    </div>
  )
}
