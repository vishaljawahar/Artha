import { prisma } from "@/lib/db"

/**
 * Monthly-Log → Bill-Checklist auto-check engine (check-only).
 *
 * When a transaction is created/edited/bulk-added, if its category (and, for the
 * Vehicles rule, its subcategory) matches one of the rules below, the matching
 * monthly bill is ticked as paid for that transaction's month. It is NEVER
 * un-ticked — removing a transaction does not un-tick the bill (a deliberate
 * "check-only" design choice). Manual ticks/unticks are therefore always
 * preserved except that re-adding a matching entry will re-tick the bill.
 *
 * Matching is hardcoded (not user-configurable) and is case-/whitespace-
 * insensitive on category, subcategory, and bill name.
 */

export type AutoCheckRule = {
  /** Monthly-Log category name to match (case-insensitive). */
  category: string
  /**
   * When set, the transaction's subcategory must also match (case-insensitive).
   * When omitted, the rule matches the category regardless of subcategory.
   */
  subcategory?: string
  /** Bill-checklist item name to tick (matched case-insensitively). */
  bill: string
}

export const BILL_AUTOCHECK_RULES: AutoCheckRule[] = [
  { category: "Electricity", bill: "Electricity" },
  { category: "Newspaper", bill: "Newspaper" },
  { category: "Internet", bill: "Internet" },
  { category: "Milk", bill: "Milk" },
  { category: "Vehicles", subcategory: "Car wash", bill: "Car wash" },
]

const norm = (s: string | null | undefined): string => (s ?? "").trim().toLowerCase()

/**
 * Pure mapping: returns the rule a (category, subcategory) pair matches, or null.
 */
export function findMatchingRule(
  categoryName: string,
  subcategory: string | null
): AutoCheckRule | null {
  const cat = norm(categoryName)
  const sub = norm(subcategory)
  for (const rule of BILL_AUTOCHECK_RULES) {
    if (norm(rule.category) !== cat) continue
    if (rule.subcategory !== undefined && norm(rule.subcategory) !== sub) continue
    return rule
  }
  return null
}

export type SyncTxnInput = {
  /** The transaction's category name (callers already resolve this for ownership checks). */
  categoryName: string
  subcategory: string | null
  /** The transaction date. Month/year is taken in UTC (the column is @db.Date / UTC midnight). */
  date: Date
}

/**
 * Ticks every bill matched by the given transactions for the transaction's month.
 * Idempotent: already-paid bills are left untouched (no paidAt churn). Never un-ticks.
 * All reads/writes are scoped to userId.
 */
export async function syncBillsForTransactions(
  userId: string,
  txns: SyncTxnInput[]
): Promise<void> {
  // 1. Resolve each transaction to a (billName, year, month) target; dedupe.
  const targets = new Map<string, { billName: string; year: number; month: number }>()
  for (const txn of txns) {
    const rule = findMatchingRule(txn.categoryName, txn.subcategory)
    if (!rule) continue
    const year = txn.date.getUTCFullYear()
    const month = txn.date.getUTCMonth() + 1 // 1-12
    const key = `${norm(rule.bill)}|${year}|${month}`
    if (!targets.has(key)) targets.set(key, { billName: rule.bill, year, month })
  }
  if (targets.size === 0) return

  // 2. Resolve bill names -> ids once (user-scoped, active bills only).
  const bills = await prisma.monthlyBill.findMany({
    where: { userId, isActive: true },
    select: { id: true, name: true },
  })
  const billIdByName = new Map(bills.map((b) => [norm(b.name), b.id]))

  // 3. Tick each target, skipping any that are already paid.
  for (const { billName, year, month } of targets.values()) {
    const monthlyBillId = billIdByName.get(norm(billName))
    if (!monthlyBillId) continue

    const existing = await prisma.monthlyBillPayment.findUnique({
      where: { userId_monthlyBillId_year_month: { userId, monthlyBillId, year, month } },
      select: { isPaid: true },
    })
    if (existing?.isPaid) continue

    await prisma.monthlyBillPayment.upsert({
      where: { userId_monthlyBillId_year_month: { userId, monthlyBillId, year, month } },
      create: { userId, monthlyBillId, year, month, isPaid: true, paidAt: new Date() },
      update: { isPaid: true, paidAt: new Date() },
    })
  }
}

/**
 * Error-swallowing wrapper. Bill auto-check is a side effect of transaction writes
 * and must NEVER fail the parent request. Routes should call this, not the raw engine.
 */
export async function safeSyncBillsForTransactions(
  userId: string,
  txns: SyncTxnInput[]
): Promise<void> {
  try {
    await syncBillsForTransactions(userId, txns)
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Bill auto-check sync failed:", error)
    }
  }
}
