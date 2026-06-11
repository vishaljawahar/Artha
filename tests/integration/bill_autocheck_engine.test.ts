/** @jest-environment node */
/**
 * Engine tests for recomputeBillPayment / syncBillsForTransactions
 * Decision table: docs/superpowers/specs/2026-06-11-bill-checklist-autocheck-design.md
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    transaction: { count: jest.fn() },
    monthlyBill: { findMany: jest.fn() },
    monthlyBillPayment: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  },
}))

import { prisma } from "@/lib/db"
import {
  recomputeBillPayment,
  safeRecomputeBillPayment,
  syncBillsForTransactions,
  safeSyncBillsForTransactions,
} from "@/lib/bill-matching"

const mockPrisma = prisma as jest.Mocked<typeof prisma>

const RULE_BILL = { id: "bill-1", matchCategoryId: "cat-utilities", matchKeyword: "bescom" }
const PAYMENT_KEY = {
  userId_monthlyBillId_year_month: {
    userId: "user-1",
    monthlyBillId: "bill-1",
    year: 2026,
    month: 6,
  },
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("recomputeBillPayment", () => {
  it("does nothing when the bill has no rule", async () => {
    await recomputeBillPayment("user-1", { id: "bill-1", matchCategoryId: null, matchKeyword: null }, 2026, 6)
    expect(mockPrisma.transaction.count).not.toHaveBeenCalled()
  })

  it("checks the bill when entries match and it is unpaid", async () => {
    ;(mockPrisma.transaction.count as jest.Mock).mockResolvedValue(1)
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue(null)
    await recomputeBillPayment("user-1", RULE_BILL, 2026, 6)
    expect(mockPrisma.monthlyBillPayment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: PAYMENT_KEY,
        create: expect.objectContaining({ isPaid: true, autoChecked: true }),
        update: expect.objectContaining({ isPaid: true, autoChecked: true }),
      })
    )
  })

  it("scopes the match count by user, category, keyword, and month window", async () => {
    ;(mockPrisma.transaction.count as jest.Mock).mockResolvedValue(0)
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue(null)
    await recomputeBillPayment("user-1", RULE_BILL, 2026, 6)
    expect(mockPrisma.transaction.count).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        categoryId: "cat-utilities",
        date: { gte: new Date(2026, 5, 1), lt: new Date(2026, 6, 1) },
        OR: [
          { description: { contains: "bescom", mode: "insensitive" } },
          { subcategory: { contains: "bescom", mode: "insensitive" } },
        ],
      },
    })
  })

  it("leaves an already-paid bill alone when entries match", async () => {
    ;(mockPrisma.transaction.count as jest.Mock).mockResolvedValue(2)
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue({
      id: "pay-1", isPaid: true, autoChecked: false,
    })
    await recomputeBillPayment("user-1", RULE_BILL, 2026, 6)
    expect(mockPrisma.monthlyBillPayment.upsert).not.toHaveBeenCalled()
    expect(mockPrisma.monthlyBillPayment.update).not.toHaveBeenCalled()
  })

  it("unchecks an auto-checked bill when no entries match", async () => {
    ;(mockPrisma.transaction.count as jest.Mock).mockResolvedValue(0)
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue({
      id: "pay-1", isPaid: true, autoChecked: true,
    })
    await recomputeBillPayment("user-1", RULE_BILL, 2026, 6)
    expect(mockPrisma.monthlyBillPayment.update).toHaveBeenCalledWith({
      where: { id: "pay-1" },
      data: { isPaid: false, paidAt: null, autoChecked: false },
    })
  })

  it("never unchecks a manual tick", async () => {
    ;(mockPrisma.transaction.count as jest.Mock).mockResolvedValue(0)
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue({
      id: "pay-1", isPaid: true, autoChecked: false,
    })
    await recomputeBillPayment("user-1", RULE_BILL, 2026, 6)
    expect(mockPrisma.monthlyBillPayment.update).not.toHaveBeenCalled()
  })

  it("leaves unpaid bills alone when no entries match", async () => {
    ;(mockPrisma.transaction.count as jest.Mock).mockResolvedValue(0)
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue({
      id: "pay-1", isPaid: false, autoChecked: false,
    })
    await recomputeBillPayment("user-1", RULE_BILL, 2026, 6)
    expect(mockPrisma.monthlyBillPayment.update).not.toHaveBeenCalled()
    expect(mockPrisma.monthlyBillPayment.upsert).not.toHaveBeenCalled()
  })

  it("trims and lowercases a padded keyword before querying", async () => {
    ;(mockPrisma.transaction.count as jest.Mock).mockResolvedValue(0)
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue(null)
    await recomputeBillPayment(
      "user-1",
      { id: "bill-1", matchCategoryId: "cat-utilities", matchKeyword: "  BESCOM  " },
      2026,
      6
    )
    expect(mockPrisma.transaction.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { description: { contains: "bescom", mode: "insensitive" } },
            { subcategory: { contains: "bescom", mode: "insensitive" } },
          ],
        }),
      })
    )
  })
})

describe("syncBillsForTransactions", () => {
  const SNAPSHOT = {
    categoryId: "cat-utilities",
    description: "BESCOM bill June",
    subcategory: null,
    date: new Date(2026, 5, 11),
  }

  it("recomputes only bills whose rule matches the snapshot", async () => {
    ;(mockPrisma.monthlyBill.findMany as jest.Mock).mockResolvedValue([
      { id: "bill-1", matchCategoryId: "cat-utilities", matchKeyword: "bescom" },
      { id: "bill-2", matchCategoryId: "cat-utilities", matchKeyword: "airtel" },
      { id: "bill-3", matchCategoryId: "cat-rent", matchKeyword: null },
    ])
    ;(mockPrisma.transaction.count as jest.Mock).mockResolvedValue(1)
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue(null)

    await syncBillsForTransactions("user-1", [SNAPSHOT])

    expect(mockPrisma.monthlyBill.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", isActive: true, matchCategoryId: { not: null } },
    })
    expect(mockPrisma.monthlyBillPayment.upsert).toHaveBeenCalledTimes(1)
    expect(mockPrisma.monthlyBillPayment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: PAYMENT_KEY })
    )
  })

  it("recomputes a bill-month only once across snapshots", async () => {
    ;(mockPrisma.monthlyBill.findMany as jest.Mock).mockResolvedValue([
      { id: "bill-1", matchCategoryId: "cat-utilities", matchKeyword: null },
    ])
    ;(mockPrisma.transaction.count as jest.Mock).mockResolvedValue(2)
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue(null)

    await syncBillsForTransactions("user-1", [SNAPSHOT, { ...SNAPSHOT, description: "Water board" }])

    expect(mockPrisma.transaction.count).toHaveBeenCalledTimes(1)
  })

  it("skips DB work when there are no snapshots", async () => {
    await syncBillsForTransactions("user-1", [])
    expect(mockPrisma.monthlyBill.findMany).not.toHaveBeenCalled()
  })

  it("skips recompute work when no bills have rules", async () => {
    ;(mockPrisma.monthlyBill.findMany as jest.Mock).mockResolvedValue([])
    await syncBillsForTransactions("user-1", [SNAPSHOT])
    expect(mockPrisma.transaction.count).not.toHaveBeenCalled()
  })
})

describe("safeSyncBillsForTransactions", () => {
  it("swallows engine errors", async () => {
    ;(mockPrisma.monthlyBill.findMany as jest.Mock).mockRejectedValue(new Error("boom"))
    await expect(
      safeSyncBillsForTransactions("user-1", [
        { categoryId: "c", description: null, subcategory: null, date: new Date(2026, 5, 11) },
      ])
    ).resolves.toBeUndefined()
  })
})

describe("safeRecomputeBillPayment", () => {
  it("swallows engine errors", async () => {
    ;(mockPrisma.transaction.count as jest.Mock).mockRejectedValue(new Error("db down"))
    await expect(safeRecomputeBillPayment("user-1", RULE_BILL, 2026, 6)).resolves.toBeUndefined()
  })
})
