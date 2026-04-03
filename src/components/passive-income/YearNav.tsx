"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface YearNavProps {
  year: number
  total: number
  onPrev: () => void
  onNext: () => void
}

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)

export function YearNav({ year, total, onPrev, onNext }: YearNavProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onPrev} className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold text-gray-900 w-14 text-center">{year}</span>
        <Button variant="ghost" size="icon" onClick={onNext} className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-3 py-1 text-sm font-semibold">
        Total: {formatINR(total)}
      </span>
    </div>
  )
}
