"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"

export interface AnnualEntry {
  id: string
  userId: string
  year: number
  entryType: "ASSET" | "LIABILITY"
  category: string
  particulars: string
  amount: number
  entryDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface EntrySectionProps {
  title: string
  entryType: "ASSET" | "LIABILITY"
  entries: AnnualEntry[]
  onEdit: (entry: AnnualEntry) => void
  onDelete: (id: string) => void
}

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)

const formatEntryDate = (dateStr: string | null): string => {
  if (!dateStr) return "—"
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
}

function CategoryGroup({
  category,
  entries,
  entryType,
  onEdit,
  onDelete,
}: {
  category: string
  entries: AnnualEntry[]
  entryType: "ASSET" | "LIABILITY"
  onEdit: (entry: AnnualEntry) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const subtotal = entries.reduce((sum, e) => sum + Number(e.amount), 0)
  const isAsset = entryType === "ASSET"

  return (
    <div className="ml-2">
      {/* Category header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
          isAsset
            ? "hover:bg-emerald-50 dark:hover:bg-emerald-950 text-foreground"
            : "hover:bg-muted text-foreground"
        )}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          )}
          <span
            className={cn(
              "font-semibold text-sm",
              isAsset ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"
            )}
          >
            {category}
          </span>
        </div>
        <span
          className={cn(
            "font-semibold text-sm",
            isAsset ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"
          )}
        >
          {formatINR(subtotal)}
        </span>
      </button>

      {/* Entry rows */}
      {expanded && (
        <div className="ml-5 space-y-0.5">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between px-3 py-1.5 rounded-md text-sm hover:bg-muted group/entry"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-muted-foreground w-14 flex-shrink-0 text-xs">
                  {formatEntryDate(entry.entryDate)}
                </span>
                <span className="text-foreground truncate">{entry.particulars}</span>
                {entry.notes && (
                  <span className="text-muted-foreground text-xs truncate hidden sm:block">
                    {entry.notes}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                <span className="text-foreground font-medium text-sm">
                  {formatINR(Number(entry.amount))}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover/entry:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-emerald-600"
                    onClick={() => onEdit(entry)}
                    aria-label="Edit entry"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-red-500"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &ldquo;{entry.particulars}&rdquo;? This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(entry.id)}
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function EntrySection({
  title,
  entryType,
  entries,
  onEdit,
  onDelete,
}: EntrySectionProps) {
  const [sectionOpen, setSectionOpen] = useState(true)
  const isAsset = entryType === "ASSET"

  const total = entries.reduce((sum, e) => sum + Number(e.amount), 0)

  // Group entries by category
  const grouped = entries.reduce<Record<string, AnnualEntry[]>>((acc, entry) => {
    if (!acc[entry.category]) acc[entry.category] = []
    acc[entry.category].push(entry)
    return acc
  }, {})
  const categories = Object.keys(grouped).sort()

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Section header */}
      <button
        onClick={() => setSectionOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors",
          isAsset ? "hover:bg-emerald-50/60 dark:hover:bg-emerald-950/60" : "hover:bg-muted"
        )}
      >
        <div className="flex items-center gap-2">
          {sectionOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-semibold text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground font-normal">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        <span
          className={cn(
            "font-bold text-base",
            isAsset ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"
          )}
        >
          {formatINR(total)}
        </span>
      </button>

      {/* Section body */}
      {sectionOpen && (
        <div className="border-t border-border py-2 space-y-0.5">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-3">No entries yet.</p>
          ) : (
            categories.map((cat) => (
              <CategoryGroup
                key={cat}
                category={cat}
                entries={grouped[cat]}
                entryType={entryType}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
