/** @jest-environment node */
/**
 * Tests for the bill auto-check engine (src/lib/bill-matching.ts).
 * - findMatchingRule: pure category/subcategory -> bill mapping.
 * - syncBillsForTransactions: ticks the matching bill (check-only), with mocked Prisma.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    monthlyBill: { findMany: jest.fn() },
    monthlyBillPayment: { findUnique: jest.fn(), upsert: jest.fn() },
  },
}))

import { findMatchingRule, syncBillsForTransactions } from "@/lib/bill-matching"
import { prisma } from "@/lib/db"

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const userId = "user-1"

beforeEach(() => {
  jest.clearAllMocks()
})

describe("findMatchingRule", () => {
  it("maps Electricity to the Electricity bill regardless of subcategory", () => {
    expect(findMatchingRule("Electricity", null)?.bill).toBe("Electricity")
    expect(findMatchingRule("Electricity", "whatever")?.bill).toBe("Electricity")
  })

  it("maps Newspaper / Internet / Milk by category alone", () => {
    expect(findMatchingRule("Newspaper", null)?.bill).toBe("Newspaper")
    expect(findMatchingRule("Internet", "some-sub")?.bill).toBe("Internet")
    expect(findMatchingRule("Milk", null)?.bill).toBe("Milk")
  })

  it("maps Vehicles + 'Car wash' subcategory to the Car wash bill", () => {
    expect(findMatchingRule("Vehicles", "Car wash")?.bill).toBe("Car wash")
  })

  it("does NOT map Vehicles with a different or empty subcategory", () => {
    expect(findMatchingRule("Vehicles", "GT")).toBeNull()
    expect(findMatchingRule("Vehicles", null)).toBeNull()
    expect(findMatchingRule("Vehicles", "")).toBeNull()
  })

  it("is case- and whitespace-insensitive on both category and subcategory", () => {
    expect(findMatchingRule("  electricity ", null)?.bill).toBe("Electricity")
    expect(findMatchingRule("VEHICLES", " car WASH ")?.bill).toBe("Car wash")
  })

  it("returns null for unmapped categories (incl. Car wash sub on the wrong category)", () => {
    expect(findMatchingRule("Food", null)).toBeNull()
    expect(findMatchingRule("Misc", "Car wash")).toBeNull()
  })
})

describe("syncBillsForTransactions (check-only)", () => {
  it("ticks the matching bill for the transaction's month", async () => {
    ;(mockPrisma.monthlyBill.findMany as jest.Mock).mockResolvedValue([
      { id: "bill-elec", name: "Electricity" },
    ])
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue(null)
    ;(mockPrisma.monthlyBillPayment.upsert as jest.Mock).mockResolvedValue({})

    await syncBillsForTransactions(userId, [
      { categoryName: "Electricity", subcategory: null, date: new Date("2026-06-13") },
    ])

    expect(mockPrisma.monthlyBillPayment.upsert as jest.Mock).toHaveBeenCalledTimes(1)
    const arg = (mockPrisma.monthlyBillPayment.upsert as jest.Mock).mock.calls[0][0]
    expect(arg.where.userId_monthlyBillId_year_month).toEqual({
      userId,
      monthlyBillId: "bill-elec",
      year: 2026,
      month: 6,
    })
    expect(arg.create.isPaid).toBe(true)
    expect(arg.update.isPaid).toBe(true)
  })

  it("matches the bill name case-insensitively", async () => {
    ;(mockPrisma.monthlyBill.findMany as jest.Mock).mockResolvedValue([
      { id: "bill-cw", name: "car WASH" },
    ])
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue(null)
    ;(mockPrisma.monthlyBillPayment.upsert as jest.Mock).mockResolvedValue({})

    await syncBillsForTransactions(userId, [
      { categoryName: "Vehicles", subcategory: "Car wash", date: new Date("2026-06-13") },
    ])

    expect(mockPrisma.monthlyBillPayment.upsert as jest.Mock).toHaveBeenCalledTimes(1)
    expect(
      (mockPrisma.monthlyBillPayment.upsert as jest.Mock).mock.calls[0][0].where
        .userId_monthlyBillId_year_month.monthlyBillId
    ).toBe("bill-cw")
  })

  it("does nothing when no bill matches the rule's name", async () => {
    ;(mockPrisma.monthlyBill.findMany as jest.Mock).mockResolvedValue([
      { id: "bill-rent", name: "Rent" },
    ])

    await syncBillsForTransactions(userId, [
      { categoryName: "Electricity", subcategory: null, date: new Date("2026-06-13") },
    ])

    expect(mockPrisma.monthlyBillPayment.upsert as jest.Mock).not.toHaveBeenCalled()
  })

  it("skips the upsert when the bill is already paid (no paidAt churn)", async () => {
    ;(mockPrisma.monthlyBill.findMany as jest.Mock).mockResolvedValue([
      { id: "bill-elec", name: "Electricity" },
    ])
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue({ isPaid: true })

    await syncBillsForTransactions(userId, [
      { categoryName: "Electricity", subcategory: null, date: new Date("2026-06-13") },
    ])

    expect(mockPrisma.monthlyBillPayment.upsert as jest.Mock).not.toHaveBeenCalled()
  })

  it("never sets isPaid to false (check-only)", async () => {
    ;(mockPrisma.monthlyBill.findMany as jest.Mock).mockResolvedValue([
      { id: "bill-elec", name: "Electricity" },
    ])
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue(null)
    ;(mockPrisma.monthlyBillPayment.upsert as jest.Mock).mockResolvedValue({})

    await syncBillsForTransactions(userId, [
      { categoryName: "Electricity", subcategory: null, date: new Date("2026-06-13") },
    ])

    for (const call of (mockPrisma.monthlyBillPayment.upsert as jest.Mock).mock.calls) {
      expect(call[0].create.isPaid).toBe(true)
      expect(call[0].update.isPaid).toBe(true)
    }
  })

  it("short-circuits with zero DB calls when nothing matches", async () => {
    await syncBillsForTransactions(userId, [
      { categoryName: "Food", subcategory: null, date: new Date("2026-06-13") },
      { categoryName: "Vehicles", subcategory: "GT", date: new Date("2026-06-13") },
    ])

    expect(mockPrisma.monthlyBill.findMany as jest.Mock).not.toHaveBeenCalled()
    expect(mockPrisma.monthlyBillPayment.upsert as jest.Mock).not.toHaveBeenCalled()
  })

  it("dedupes multiple matches for the same bill+month into a single upsert", async () => {
    ;(mockPrisma.monthlyBill.findMany as jest.Mock).mockResolvedValue([
      { id: "bill-elec", name: "Electricity" },
    ])
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue(null)
    ;(mockPrisma.monthlyBillPayment.upsert as jest.Mock).mockResolvedValue({})

    await syncBillsForTransactions(userId, [
      { categoryName: "Electricity", subcategory: null, date: new Date("2026-06-01") },
      { categoryName: "Electricity", subcategory: "x", date: new Date("2026-06-25") },
    ])

    expect(mockPrisma.monthlyBillPayment.upsert as jest.Mock).toHaveBeenCalledTimes(1)
  })

  it("ticks separate months for the same bill across different months", async () => {
    ;(mockPrisma.monthlyBill.findMany as jest.Mock).mockResolvedValue([
      { id: "bill-elec", name: "Electricity" },
    ])
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue(null)
    ;(mockPrisma.monthlyBillPayment.upsert as jest.Mock).mockResolvedValue({})

    await syncBillsForTransactions(userId, [
      { categoryName: "Electricity", subcategory: null, date: new Date("2026-05-20") },
      { categoryName: "Electricity", subcategory: null, date: new Date("2026-06-20") },
    ])

    expect(mockPrisma.monthlyBillPayment.upsert as jest.Mock).toHaveBeenCalledTimes(2)
    const months = (mockPrisma.monthlyBillPayment.upsert as jest.Mock).mock.calls
      .map((c) => c[0].where.userId_monthlyBillId_year_month.month)
      .sort()
    expect(months).toEqual([5, 6])
  })

  it("attributes the month from the UTC date (handles UTC-midnight @db.Date values)", async () => {
    ;(mockPrisma.monthlyBill.findMany as jest.Mock).mockResolvedValue([
      { id: "bill-elec", name: "Electricity" },
    ])
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue(null)
    ;(mockPrisma.monthlyBillPayment.upsert as jest.Mock).mockResolvedValue({})

    // A @db.Date stored as UTC midnight on the 1st of the month.
    await syncBillsForTransactions(userId, [
      { categoryName: "Electricity", subcategory: null, date: new Date("2026-03-01T00:00:00.000Z") },
    ])

    const key = (mockPrisma.monthlyBillPayment.upsert as jest.Mock).mock.calls[0][0].where
      .userId_monthlyBillId_year_month
    expect(key.year).toBe(2026)
    expect(key.month).toBe(3)
  })
})
