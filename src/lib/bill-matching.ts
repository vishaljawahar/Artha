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
