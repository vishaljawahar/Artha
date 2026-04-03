"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { KpiCard } from "@/components/dashboard/KpiCard"
import { MonthlyChart } from "@/components/dashboard/MonthlyChart"
import { ExpenseDonut } from "@/components/dashboard/ExpenseDonut"
import { HealthScorecard } from "@/components/dashboard/HealthScorecard"
import { RecentTransactions } from "@/components/dashboard/RecentTransactions"

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthlySummaryItem {
  month: number
  monthName: string
  income: number
  emiTotal: number
  savings: number
  netIncome: number
  expenditure: number
  surplus: number
}

interface AnnualTotals {
  totalIncome: number
  totalExpenditure: number
  totalSavings: number
  totalSurplus: number
  avgMonthlyExpenditure: number
}

interface CategoryItem {
  categoryId: string
  categoryName: string
  categoryColor: string | null
  total: number
}

interface RecentTransaction {
  id: string
  date: string
  description: string
  amount: number
  categoryName: string
  categoryIcon: string | null
  categoryColor: string | null
}

interface DashboardData {
  year: number
  monthlySummary: MonthlySummaryItem[]
  annualTotals: AnnualTotals
  categoryBreakdown: CategoryItem[]
  recentTransactions: RecentTransaction[]
  emiLoad: number
  savingsRate: number
  expenditureRate: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INR = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v)

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/dashboard?year=${year}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard data")
        return res.json()
      })
      .then((json: DashboardData) => {
        setData(json)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [year])

  // Months with logged headers
  const activeMonths = new Set(
    (data?.monthlySummary ?? [])
      .filter(
        (m) =>
          m.income > 0 || m.emiTotal > 0 || m.savings > 0
      )
      .map((m) => m.month)
  )
  const monthsLogged = activeMonths.size

  // Surplus color
  const surplusColor =
    !data || data.annualTotals.totalSurplus >= 0 ? "text-emerald-600" : "text-red-600"

  const isEmpty = !loading && data !== null && monthsLogged === 0

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your financial overview</p>
        </div>

        {/* Year navigation */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5 shadow-sm">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Previous year"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-800 px-2 min-w-[3rem] text-center">
            {year}
          </span>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Next year"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
          {error}
        </div>
      )}

      {/* ── Empty state ── */}
      {isEmpty && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📊</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">No data for {year}</h2>
          <p className="text-gray-500 text-sm mb-6">
            Start by logging your monthly income, EMIs, and savings to see your financial overview here.
          </p>
          <Link
            href="/monthly-log"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Go to Monthly Log →
          </Link>
        </div>
      )}

      {/* ── KPI Cards ── */}
      {!isEmpty && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
            <KpiCard
              label="Total Income"
              value={loading ? "—" : INR(data?.annualTotals.totalIncome ?? 0)}
              loading={loading}
            />
            <KpiCard
              label="Total Savings"
              value={loading ? "—" : INR(data?.annualTotals.totalSavings ?? 0)}
              valueColor="text-emerald-600"
              loading={loading}
            />
            <KpiCard
              label="Total Expenditure"
              value={loading ? "—" : INR(data?.annualTotals.totalExpenditure ?? 0)}
              valueColor="text-rose-600"
              loading={loading}
            />
            <KpiCard
              label="Total Surplus"
              value={loading ? "—" : INR(data?.annualTotals.totalSurplus ?? 0)}
              valueColor={surplusColor}
              loading={loading}
            />
            <KpiCard
              label="Months Logged"
              value={loading ? "—" : String(monthsLogged)}
              loading={loading}
            />
          </div>

          {/* ── Charts Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
            {/* Monthly bar chart — wider */}
            <div className="lg:col-span-3">
              <MonthlyChart
                data={data?.monthlySummary ?? []}
                activeMonths={activeMonths}
                loading={loading}
              />
            </div>
            {/* Donut chart */}
            <div className="lg:col-span-2">
              <ExpenseDonut
                data={data?.categoryBreakdown ?? []}
                loading={loading}
              />
            </div>
          </div>

          {/* ── Health + Recent Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Health scorecard */}
            <div className="lg:col-span-2">
              <HealthScorecard
                emiLoad={data?.emiLoad ?? 0}
                savingsRate={data?.savingsRate ?? 0}
                expenditureRate={data?.expenditureRate ?? 0}
                loading={loading}
              />
            </div>
            {/* Recent transactions */}
            <div className="lg:col-span-3">
              <RecentTransactions
                transactions={data?.recentTransactions ?? []}
                loading={loading}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
