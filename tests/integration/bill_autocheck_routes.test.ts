/** @jest-environment node */
/**
 * Verifies transaction routes trigger the bill auto-check engine.
 */

jest.mock("@/auth", () => ({ auth: jest.fn() }))

jest.mock("@/lib/db", () => ({
  prisma: {
    category: { findFirst: jest.fn() },
    monthlyHeader: { findUnique: jest.fn() },
    transaction: {
      create: jest.fn(),
      createMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

jest.mock("@/lib/bill-matching", () => ({
  safeSyncBillsForTransactions: jest.fn().mockResolvedValue(undefined),
}))

import { POST } from "@/app/api/transactions/route"
import { PUT, DELETE } from "@/app/api/transactions/[id]/route"
import { POST as BULK_POST } from "@/app/api/transactions/bulk/route"
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { safeSyncBillsForTransactions } from "@/lib/bill-matching"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = auth as jest.MockedFunction<any>
const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockSync = safeSyncBillsForTransactions as jest.MockedFunction<typeof safeSyncBillsForTransactions>

const MOCK_SESSION = {
  user: { id: "user-1", name: "Test User", email: "test@test.com" },
  expires: "2099-01-01",
} as any

const DB_TXN = {
  id: "txn-1",
  userId: "user-1",
  monthlyHeaderId: null,
  date: new Date("2026-06-11"),
  categoryId: "cat-1",
  subcategory: null,
  description: "BESCOM bill",
  amount: 1450,
  isBulk: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue(MOCK_SESSION)
  ;(mockPrisma.category.findFirst as jest.Mock).mockResolvedValue({ id: "cat-1", userId: "user-1" })
  ;(mockPrisma.monthlyHeader.findUnique as jest.Mock).mockResolvedValue(null)
})

describe("POST /api/transactions", () => {
  it("syncs bills with the created transaction snapshot", async () => {
    ;(mockPrisma.transaction.create as jest.Mock).mockResolvedValue(DB_TXN)
    const req = new NextRequest("http://localhost/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2026-06-11", categoryId: "cat-1", description: "BESCOM bill",
        amount: 1450, year: 2026, month: 6,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(mockSync).toHaveBeenCalledWith("user-1", [
      { categoryId: "cat-1", description: "BESCOM bill", subcategory: null, date: DB_TXN.date },
    ])
  })
})

describe("PUT /api/transactions/[id]", () => {
  it("syncs bills with before and after snapshots", async () => {
    const before = { ...DB_TXN, categoryId: "cat-old", description: "Old desc" }
    const after = { ...DB_TXN, categoryId: "cat-1", description: "New desc" }
    ;(mockPrisma.transaction.findUnique as jest.Mock).mockResolvedValue(before)
    ;(mockPrisma.transaction.update as jest.Mock).mockResolvedValue(after)
    const req = new NextRequest("http://localhost/api/transactions/txn-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "2026-06-11", categoryId: "cat-1", description: "New desc", amount: 1450 }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "txn-1" }) })
    expect(res.status).toBe(200)
    expect(mockSync).toHaveBeenCalledWith("user-1", [
      { categoryId: "cat-old", description: "Old desc", subcategory: null, date: before.date },
      { categoryId: "cat-1", description: "New desc", subcategory: null, date: after.date },
    ])
  })
})

describe("DELETE /api/transactions/[id]", () => {
  it("syncs bills with the deleted snapshot", async () => {
    ;(mockPrisma.transaction.findUnique as jest.Mock).mockResolvedValue(DB_TXN)
    ;(mockPrisma.transaction.delete as jest.Mock).mockResolvedValue(DB_TXN)
    const req = new NextRequest("http://localhost/api/transactions/txn-1", { method: "DELETE" })
    const res = await DELETE(req, { params: Promise.resolve({ id: "txn-1" }) })
    expect(res.status).toBe(200)
    expect(mockSync).toHaveBeenCalledWith("user-1", [
      { categoryId: "cat-1", description: "BESCOM bill", subcategory: null, date: DB_TXN.date },
    ])
  })
})

describe("POST /api/transactions/bulk", () => {
  it("syncs bills with one snapshot per created line", async () => {
    ;(mockPrisma.transaction.createMany as jest.Mock).mockResolvedValue({ count: 2 })
    const req = new NextRequest("http://localhost/api/transactions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines: "1450 BESCOM bill\n300 Water board", categoryId: "cat-1", year: 2026, month: 6 }),
    })
    const res = await BULK_POST(req)
    expect(res.status).toBe(201)
    expect(mockSync).toHaveBeenCalledTimes(1)
    const [userId, snapshots] = mockSync.mock.calls[0]
    expect(userId).toBe("user-1")
    expect(snapshots).toHaveLength(2)
    expect(snapshots[0]).toMatchObject({ categoryId: "cat-1", description: "BESCOM bill", subcategory: null })
    expect(snapshots[1]).toMatchObject({ categoryId: "cat-1", description: "Water board", subcategory: null })
  })
})
