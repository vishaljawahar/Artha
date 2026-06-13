/** @jest-environment node */
/**
 * Verifies the transaction routes wire the bill auto-check engine in.
 * The engine itself is mocked here (it's unit-tested in bill_autocheck_engine.test.ts);
 * these tests only prove the hook fires with the right inputs after each mutation.
 */

jest.mock("@/auth", () => ({ auth: jest.fn() }))

jest.mock("@/lib/db", () => ({
  prisma: {
    category: { findFirst: jest.fn() },
    monthlyHeader: { findUnique: jest.fn() },
    transaction: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      createMany: jest.fn(),
    },
  },
}))

jest.mock("@/lib/bill-matching", () => ({
  safeSyncBillsForTransactions: jest.fn(),
}))

import { POST } from "@/app/api/transactions/route"
import { PUT } from "@/app/api/transactions/[id]/route"
import { POST as BULK_POST } from "@/app/api/transactions/bulk/route"
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { safeSyncBillsForTransactions } from "@/lib/bill-matching"

const mockAuth = auth as jest.MockedFunction<jest.MockableFunction & typeof auth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockSync = safeSyncBillsForTransactions as jest.Mock

const MOCK_SESSION = {
  user: { id: "user-1", name: "Test", email: "t@t.com" },
  expires: "2099-01-01",
} as never

beforeEach(() => {
  jest.clearAllMocks()
  ;(mockAuth as jest.Mock).mockResolvedValue(MOCK_SESSION)
})

describe("POST /api/transactions wires auto-check", () => {
  it("calls the engine with the created transaction after create", async () => {
    ;(mockPrisma.category.findFirst as jest.Mock).mockResolvedValue({
      id: "cat-elec",
      name: "Electricity",
      userId: "user-1",
    })
    ;(mockPrisma.monthlyHeader.findUnique as jest.Mock).mockResolvedValue(null)
    ;(mockPrisma.transaction.create as jest.Mock).mockResolvedValue({
      id: "txn-1",
      userId: "user-1",
      categoryId: "cat-elec",
      subcategory: null,
      date: new Date("2026-06-13"),
      description: "BESCOM",
      amount: 1200,
    })

    const req = new NextRequest("http://localhost/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2026-06-13",
        categoryId: "cat-elec",
        description: "BESCOM",
        amount: 1200,
        year: 2026,
        month: 6,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(mockSync).toHaveBeenCalledTimes(1)
    expect(mockSync).toHaveBeenCalledWith("user-1", [
      { categoryName: "Electricity", subcategory: null, date: new Date("2026-06-13") },
    ])
  })
})

describe("PUT /api/transactions/[id] wires auto-check", () => {
  it("calls the engine with the updated transaction after update", async () => {
    ;(mockPrisma.transaction.findUnique as jest.Mock).mockResolvedValue({
      id: "txn-1",
      userId: "user-1",
    })
    ;(mockPrisma.category.findFirst as jest.Mock).mockResolvedValue({
      id: "cat-veh",
      name: "Vehicles",
      userId: "user-1",
    })
    ;(mockPrisma.transaction.update as jest.Mock).mockResolvedValue({
      id: "txn-1",
      userId: "user-1",
      categoryId: "cat-veh",
      subcategory: "Car wash",
      date: new Date("2026-06-10"),
      description: "",
      amount: 300,
    })

    const req = new NextRequest("http://localhost/api/transactions/txn-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2026-06-10",
        categoryId: "cat-veh",
        subcategory: "Car wash",
        amount: 300,
      }),
    })

    const res = await PUT(req, { params: Promise.resolve({ id: "txn-1" }) })
    expect(res.status).toBe(200)
    expect(mockSync).toHaveBeenCalledTimes(1)
    expect(mockSync).toHaveBeenCalledWith("user-1", [
      { categoryName: "Vehicles", subcategory: "Car wash", date: new Date("2026-06-10") },
    ])
  })
})

describe("POST /api/transactions/bulk wires auto-check", () => {
  it("calls the engine for every bulk-created line", async () => {
    ;(mockPrisma.category.findFirst as jest.Mock).mockResolvedValue({
      id: "cat-elec",
      name: "Electricity",
      userId: "user-1",
    })
    ;(mockPrisma.monthlyHeader.findUnique as jest.Mock).mockResolvedValue(null)
    ;(mockPrisma.transaction.createMany as jest.Mock).mockResolvedValue({ count: 2 })

    const req = new NextRequest("http://localhost/api/transactions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: "500 Meter reading\n800",
        categoryId: "cat-elec",
        year: 2026,
        month: 6,
      }),
    })

    const res = await BULK_POST(req)
    expect(res.status).toBe(201)
    expect(mockSync).toHaveBeenCalledTimes(1)
    const [uid, entries] = mockSync.mock.calls[0]
    expect(uid).toBe("user-1")
    expect(Array.isArray(entries)).toBe(true)
    expect(entries).toHaveLength(2)
    expect(entries[0].categoryName).toBe("Electricity")
    expect(entries[0].subcategory).toBeNull()
    expect(entries[0].date).toBeInstanceOf(Date)
  })
})
