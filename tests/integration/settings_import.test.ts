/** @jest-environment node */
/**
 * Integration tests for /api/settings/import (POST)
 */

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      createMany: jest.fn(),
    },
    eMI: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
    budgetTarget: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
    monthlyHeader: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

import { POST } from "@/app/api/settings/import/route"
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

const MOCK_CATEGORIES = [
  { id: "cat-1", name: "Food", icon: "🍔", sortOrder: 0, userId: "user-1" },
  { id: "cat-2", name: "Transport", icon: "🚗", sortOrder: 1, userId: "user-1" },
]

const MOCK_HEADER = {
  id: "header-1",
  userId: "user-1",
  year: 2026,
  month: 1,
  income: 0,
  emiTotal: 0,
  savings: 0,
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("POST /api/settings/import", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: [{ date: "2026-01-15", categoryName: "Food", amount: 500 }],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 201 with imported count when rows are valid", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.category.findMany as jest.Mock).mockResolvedValue(MOCK_CATEGORIES)
    ;(mockPrisma.monthlyHeader.upsert as jest.Mock).mockResolvedValue(MOCK_HEADER)
    ;(mockPrisma.transaction.create as jest.Mock).mockResolvedValue({ id: "txn-new" })

    const req = new NextRequest("http://localhost/api/settings/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: [
          { date: "2026-01-15", categoryName: "Food", description: "Groceries", amount: 2500 },
          { date: "2026-01-20", categoryName: "transport", amount: 1800 },
        ],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.imported).toBe(2)
    expect(body.skipped).toBe(0)
    expect(body.errors).toHaveLength(0)
  })

  it("skips rows with unknown category name", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.category.findMany as jest.Mock).mockResolvedValue(MOCK_CATEGORIES)
    ;(mockPrisma.monthlyHeader.upsert as jest.Mock).mockResolvedValue(MOCK_HEADER)
    ;(mockPrisma.transaction.create as jest.Mock).mockResolvedValue({ id: "txn-new" })

    const req = new NextRequest("http://localhost/api/settings/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: [
          { date: "2026-01-15", categoryName: "Food", amount: 500 },
          { date: "2026-01-15", categoryName: "UnknownCategory", amount: 300 },
        ],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.imported).toBe(1)
    expect(body.skipped).toBe(1)
    expect(body.errors).toHaveLength(1)
    expect(body.errors[0]).toContain("UnknownCategory")
  })

  it("matches category names case-insensitively", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.category.findMany as jest.Mock).mockResolvedValue(MOCK_CATEGORIES)
    ;(mockPrisma.monthlyHeader.upsert as jest.Mock).mockResolvedValue(MOCK_HEADER)
    ;(mockPrisma.transaction.create as jest.Mock).mockResolvedValue({ id: "txn-new" })

    const req = new NextRequest("http://localhost/api/settings/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: [
          { date: "2026-01-15", categoryName: "FOOD", amount: 500 },
          { date: "2026-01-15", categoryName: "Transport", amount: 300 },
        ],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.imported).toBe(2)
    expect(body.skipped).toBe(0)
  })

  it("returns 400 when rows array is empty", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    const req = new NextRequest("http://localhost/api/settings/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: [] }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 when rows is missing", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    const req = new NextRequest("http://localhost/api/settings/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("skips rows with invalid date", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.category.findMany as jest.Mock).mockResolvedValue(MOCK_CATEGORIES)

    const req = new NextRequest("http://localhost/api/settings/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: [
          { date: "not-a-date", categoryName: "Food", amount: 500 },
          { date: "2026-01-15", categoryName: "Food", amount: 500 },
        ],
      }),
    })
    ;(mockPrisma.monthlyHeader.upsert as jest.Mock).mockResolvedValue(MOCK_HEADER)
    ;(mockPrisma.transaction.create as jest.Mock).mockResolvedValue({ id: "txn-new" })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.imported).toBe(1)
    expect(body.skipped).toBe(1)
  })
})
