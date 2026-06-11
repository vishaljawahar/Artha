import { prisma } from "@/lib/db"

export interface BillMatchRule {
  matchCategoryId: string | null
  matchKeyword: string | null
}

export interface TransactionSnapshot {
  categoryId: string
  description: string | null
  subcategory: string | null
  date: Date
}

export function transactionMatchesRule(
  rule: BillMatchRule,
  txn: { categoryId: string; description: string | null; subcategory: string | null }
): boolean {
  if (!rule.matchCategoryId || rule.matchCategoryId !== txn.categoryId) return false
  const keyword = rule.matchKeyword?.trim().toLowerCase()
  if (!keyword) return true
  return [txn.description ?? "", txn.subcategory ?? ""].some((field) =>
    field.toLowerCase().includes(keyword)
  )
}

type RuleBill = BillMatchRule & { id: string }

export async function recomputeBillPayment(
  userId: string,
  bill: RuleBill,
  year: number,
  month: number
): Promise<void> {
  if (!bill.matchCategoryId) return

  const keyword = bill.matchKeyword?.trim()
  const matchCount = await prisma.transaction.count({
    where: {
      userId,
      categoryId: bill.matchCategoryId,
      date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) },
      ...(keyword
        ? {
            OR: [
              { description: { contains: keyword, mode: "insensitive" } },
              { subcategory: { contains: keyword, mode: "insensitive" } },
            ],
          }
        : {}),
    },
  })

  const paymentKey = {
    userId_monthlyBillId_year_month: { userId, monthlyBillId: bill.id, year, month },
  }
  const existing = await prisma.monthlyBillPayment.findUnique({ where: paymentKey })

  if (matchCount > 0) {
    if (existing?.isPaid) return
    await prisma.monthlyBillPayment.upsert({
      where: paymentKey,
      create: {
        userId,
        monthlyBillId: bill.id,
        year,
        month,
        isPaid: true,
        paidAt: new Date(),
        autoChecked: true,
      },
      update: { isPaid: true, paidAt: new Date(), autoChecked: true },
    })
  } else if (existing?.isPaid && existing.autoChecked) {
    await prisma.monthlyBillPayment.update({
      where: { id: existing.id },
      data: { isPaid: false, paidAt: null, autoChecked: false },
    })
  }
}

export async function syncBillsForTransactions(
  userId: string,
  snapshots: TransactionSnapshot[]
): Promise<void> {
  if (snapshots.length === 0) return

  const bills = await prisma.monthlyBill.findMany({
    where: { userId, isActive: true, matchCategoryId: { not: null } },
  })
  if (bills.length === 0) return

  const recomputed = new Set<string>()
  for (const txn of snapshots) {
    const year = txn.date.getFullYear()
    const month = txn.date.getMonth() + 1
    for (const bill of bills) {
      if (!transactionMatchesRule(bill, txn)) continue
      const key = `${bill.id}:${year}-${month}`
      if (recomputed.has(key)) continue
      recomputed.add(key)
      await recomputeBillPayment(userId, bill, year, month)
    }
  }
}

export async function safeSyncBillsForTransactions(
  userId: string,
  snapshots: TransactionSnapshot[]
): Promise<void> {
  try {
    await syncBillsForTransactions(userId, snapshots)
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Bill auto-check sync error:", error)
    }
  }
}

export async function safeRecomputeBillPayment(
  userId: string,
  bill: RuleBill,
  year: number,
  month: number
): Promise<void> {
  try {
    await recomputeBillPayment(userId, bill, year, month)
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Bill auto-check recompute error:", error)
    }
  }
}
