/** @jest-environment node */
/**
 * Integration tests for /api/transactions (GET, POST) and /api/transactions/[id] (DELETE)
 */

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn(), count: jest.fn(), update: jest.fn() },
    transaction: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    category: { findMany: jest.fn(), createMany: jest.fn(), findFirst: jest.fn() },
    monthlyHeader: { findUnique: jest.fn(), upsert: jest.fn() },
    annualEntry: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    passiveIncome: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    asset: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

import { GET, POST } from "@/app/api/transactions/route"
import { DELETE } from "@/app/api/transactions/[id]/route"
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = auth as jest.MockedFunction<any>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

const MOCK_SESSION = {
  user: { id: "user-1", name: "Test User", email: "test@test.com" },
  expires: "2099-01-01",
} as any

beforeEach(() => {
  jest.clearAllMocks()
})

describe("GET /api/transactions", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/transactions?year=2026&month=4")
    const res = await GET(req)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 200 with transactions array when authenticated", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    const mockTxns = [
      {
        id: "txn-1",
        userId: "user-1",
        categoryId: "cat-1",
        date: new Date("2026-04-01"),
        description: "Groceries",
        amount: 1500,
        createdAt: new Date(),
      },
    ]
    ;(mockPrisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTxns)
    ;(mockPrisma.category.findMany as jest.Mock).mockResolvedValue([
      { id: "cat-1", name: "Food", userId: "user-1" },
    ])

    const req = new NextRequest("http://localhost/api/transactions?year=2026&month=4")
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty("transactions")
    expect(Array.isArray(body.transactions)).toBe(true)
    expect(body.transactions[0].id).toBe("txn-1")
  })

  it("returns 400 when year/month params are invalid", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    const req = new NextRequest("http://localhost/api/transactions?year=abc&month=4")
    const res = await GET(req)

    expect(res.status).toBe(400)
  })
})

describe("POST /api/transactions", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2026-04-01",
        categoryId: "cat-1",
        description: "Test",
        amount: 500,
        year: 2026,
        month: 4,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 201 when valid transaction is created", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    ;(mockPrisma.category.findFirst as jest.Mock).mockResolvedValue({
      id: "cat-1",
      name: "Food",
      userId: "user-1",
    })
    ;(mockPrisma.monthlyHeader.findUnique as jest.Mock).mockResolvedValue(null)
    ;(mockPrisma.transaction.create as jest.Mock).mockResolvedValue({
      id: "txn-new",
      userId: "user-1",
      categoryId: "cat-1",
      date: new Date("2026-04-01"),
      description: "Groceries",
      amount: 500,
      createdAt: new Date(),
      subcategory: null,
      monthlyHeaderId: null,
    })

    const req = new NextRequest("http://localhost/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2026-04-01",
        categoryId: "cat-1",
        description: "Groceries",
        amount: 500,
        year: 2026,
        month: 4,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)

    const body = await res.json()
    expect(body).toHaveProperty("transaction")
    expect(body.transaction.id).toBe("txn-new")
  })

  it("returns 400 when amount is missing", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    const req = new NextRequest("http://localhost/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2026-04-01",
        categoryId: "cat-1",
        description: "Groceries",
        // amount intentionally omitted
        year: 2026,
        month: 4,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe("DELETE /api/transactions/[id]", () => {
  it("returns 200 when deleting own transaction", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    ;(mockPrisma.transaction.findUnique as jest.Mock).mockResolvedValue({
      id: "txn-1",
      userId: "user-1",
    })
    ;(mockPrisma.transaction.delete as jest.Mock).mockResolvedValue({ id: "txn-1" })

    const req = new NextRequest("http://localhost/api/transactions/txn-1", {
      method: "DELETE",
    })

    const res = await DELETE(req, { params: Promise.resolve({ id: "txn-1" }) })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("returns 403 when trying to delete another user's transaction", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    ;(mockPrisma.transaction.findUnique as jest.Mock).mockResolvedValue({
      id: "txn-1",
      userId: "other-user",
    })

    const req = new NextRequest("http://localhost/api/transactions/txn-1", {
      method: "DELETE",
    })

    const res = await DELETE(req, { params: Promise.resolve({ id: "txn-1" }) })
    expect(res.status).toBe(403)
  })

  it("returns 404 when transaction does not exist", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    ;(mockPrisma.transaction.findUnique as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/transactions/nonexistent", {
      method: "DELETE",
    })

    const res = await DELETE(req, { params: Promise.resolve({ id: "nonexistent" }) })
    expect(res.status).toBe(404)
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/transactions/txn-1", {
      method: "DELETE",
    })

    const res = await DELETE(req, { params: Promise.resolve({ id: "txn-1" }) })
    expect(res.status).toBe(401)
  })
})
