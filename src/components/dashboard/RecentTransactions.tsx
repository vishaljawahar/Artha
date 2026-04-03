"use client"

import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"

interface RecentTransaction {
  id: string
  date: string
  description: string
  amount: number
  categoryName: string
  categoryIcon: string | null
  categoryColor: string | null
}

interface RecentTransactionsProps {
  transactions: RecentTransaction[]
  loading?: boolean
}

const INR = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v)

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

export function RecentTransactions({ transactions, loading }: RecentTransactionsProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <Skeleton className="h-5 w-44 mb-4" />
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-3.5 w-32 mb-1.5" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Recent Transactions</h3>
        <Link
          href="/monthly-log"
          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
        >
          View all →
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-gray-400">No transactions yet</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {transactions.map((tx) => (
            <li key={tx.id} className="flex items-center gap-3">
              {/* Category icon */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                style={{ background: tx.categoryColor ? `${tx.categoryColor}22` : "#F3F4F6" }}
              >
                {tx.categoryIcon ?? "💳"}
              </div>

              {/* Description + category chip */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate font-medium">{tx.description}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-gray-400">{formatDate(tx.date)}</span>
                  <span className="text-gray-200">·</span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{
                      background: tx.categoryColor ? `${tx.categoryColor}18` : "#F3F4F6",
                      color: tx.categoryColor ?? "#6B7280",
                    }}
                  >
                    {tx.categoryName}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <span className="text-sm font-semibold text-gray-800 flex-shrink-0">
                {INR(tx.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
