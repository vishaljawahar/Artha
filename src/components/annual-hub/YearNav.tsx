"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface YearNavProps {
  year: number
  onPrev: () => void
  onNext: () => void
}

export function YearNav({ year, onPrev, onNext }: YearNavProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrev}
        className="h-8 w-8 text-gray-500 hover:text-gray-900"
        aria-label="Previous year"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-lg font-semibold text-gray-900 min-w-[4rem] text-center">
        {year}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        className="h-8 w-8 text-gray-500 hover:text-gray-900"
        aria-label="Next year"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
