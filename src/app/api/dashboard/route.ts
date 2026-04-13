import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get("year")
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

  if (isNaN(year)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 })
  }

  // Fetch all monthly headers for user + year
  const monthlyHeaders = await prisma.monthlyHeader.findMany({
    where: { userId, year },
    orderBy: { month: "asc" },
  })

  // Fetch all transactions for user + year
  const startOfYear = new Date(year, 0, 1)
  const endOfYear = new Date(year, 11, 31)

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startOfYear,
        lte: endOfYear,
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  })

  // Fetch all categories for user
  const categories = await prisma.category.findMany({
    where: { userId },
  })
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  // Build a map of month -> header
  const headerByMonth = Object.fromEntries(monthlyHeaders.map((h) => [h.month, h]))

  // Group transactions by month
  const txByMonth: Record<number, typeof transactions> = {}
  for (const tx of transactions) {
    const m = new Date(tx.date).getMonth() + 1
    if (!txByMonth[m]) txByMonth[m] = []
    txByMonth[m].push(tx)
  }

  // Build monthlySummary for all 12 months
  const monthlySummary = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const header = headerByMonth[month]
    const income = header ? Number(header.income) : 0
    const emiTotal = header ? Number(header.emiTotal) : 0
    const savings = header ? Number(header.savings) : 0
    const netIncome = income - emiTotal - savings
    const expenditure = (txByMonth[month] ?? []).reduce((sum, tx) => sum + Number(tx.amount), 0)
    const surplus = netIncome - expenditure
    return {
      month,
      monthName: MONTH_NAMES[i],
      income,
      emiTotal,
      savings,
      netIncome,
      expenditure,
      surplus,
    }
  })

  // Annual totals — computed over months that have a header
  const activeMonths = monthlySummary.filter((m) => headerByMonth[m.month])
  const totalIncome = activeMonths.reduce((s, m) => s + m.income, 0)
  const totalEmi = activeMonths.reduce((s, m) => s + m.emiTotal, 0)
  const totalSavings = activeMonths.reduce((s, m) => s + m.savings, 0)
  const totalExpenditure = transactions.reduce((s, tx) => s + Number(tx.amount), 0)
  const totalNetIncome = activeMonths.reduce((s, m) => s + m.netIncome, 0)
  const totalSurplus = totalNetIncome - totalExpenditure
  const avgMonthlyExpenditure = activeMonths.length > 0
    ? activeMonths.reduce((s, m) => s + m.expenditure, 0) / activeMonths.length
    : 0

  // Category breakdown — all year's transactions grouped by categoryId
  const categoryTotals: Record<string, number> = {}
  for (const tx of transactions) {
    categoryTotals[tx.categoryId] = (categoryTotals[tx.categoryId] ?? 0) + Number(tx.amount)
  }
  const categoryBreakdown = Object.entries(categoryTotals)
    .map(([categoryId, total]) => {
      const cat = categoryMap[categoryId]
      return {
        categoryId,
        categoryName: cat?.name ?? "Unknown",
        categoryColor: cat?.color ?? null,
        total,
      }
    })
    .sort((a, b) => b.total - a.total)

  // Recent transactions — last 5
  const recentTransactions = transactions.slice(0, 5).map((tx) => {
    const cat = categoryMap[tx.categoryId]
    return {
      id: tx.id,
      date: tx.date instanceof Date ? tx.date.toISOString().split("T")[0] : String(tx.date),
      description: tx.description,
      amount: Number(tx.amount),
      categoryName: cat?.name ?? "Unknown",
      categoryIcon: cat?.icon ?? null,
      categoryColor: cat?.color ?? null,
    }
  })

  // Health metrics — averages over months with headers only
  const n = activeMonths.length
  const avgIncome = n > 0 ? activeMonths.reduce((s, m) => s + m.income, 0) / n : 0
  const avgEmi = n > 0 ? activeMonths.reduce((s, m) => s + m.emiTotal, 0) / n : 0
  const avgSavings = n > 0 ? activeMonths.reduce((s, m) => s + m.savings, 0) / n : 0
  const avgExpenditure = n > 0 ? activeMonths.reduce((s, m) => s + m.expenditure, 0) / n : 0
  const avgNetIncome = n > 0 ? activeMonths.reduce((s, m) => s + m.netIncome, 0) / n : 0

  const emiLoad = avgIncome > 0 ? (avgEmi / avgIncome) * 100 : 0
  const savingsRate = avgIncome > 0 ? (avgSavings / avgIncome) * 100 : 0
  const expenditureRate = avgNetIncome > 0 ? (avgExpenditure / avgNetIncome) * 100 : 0

  return NextResponse.json({
    year,
    monthlySummary,
    annualTotals: {
      totalIncome,
      totalEmi,
      totalExpenditure,
      totalSavings,
      totalSurplus,
      avgMonthlyExpenditure,
    },
    categoryBreakdown,
    recentTransactions,
    emiLoad,
    savingsRate,
    expenditureRate,
  })
}
