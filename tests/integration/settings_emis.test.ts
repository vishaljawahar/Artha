/** @jest-environment node */
/**
 * Integration tests for /api/settings/emis routes
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

import { GET, POST } from "@/app/api/settings/emis/route"
import { PUT, DELETE } from "@/app/api/settings/emis/[id]/route"
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

const MOCK_EMIS = [
  {
    id: "emi-1",
    userId: "user-1",
    name: "Car Loan",
    amount: 15000,
    startDate: new Date("2025-01-01"),
    endDate: new Date("2027-12-01"),
    isActive: true,
    createdAt: new Date(),
  },
]

beforeEach(() => {
  jest.clearAllMocks()
})

// ─── GET /api/settings/emis ───────────────────────────────────────────────────

describe("GET /api/settings/emis", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/emis")
    const res = await GET(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 200 with emis array when authenticated", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.eMI.findMany as jest.Mock).mockResolvedValue(MOCK_EMIS)
    const req = new NextRequest("http://localhost/api/settings/emis")
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.emis).toHaveLength(1)
    expect(body.emis[0].name).toBe("Car Loan")
  })
})

// ─── POST /api/settings/emis ──────────────────────────────────────────────────

describe("POST /api/settings/emis", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/emis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Home Loan", amount: 20000, startDate: "2026-01-01" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 201 when valid EMI is created", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.eMI.create as jest.Mock).mockResolvedValue({
      id: "emi-2",
      userId: "user-1",
      name: "Home Loan",
      amount: 20000,
      startDate: new Date("2026-01-01"),
      endDate: null,
      isActive: true,
      createdAt: new Date(),
    })
    const req = new NextRequest("http://localhost/api/settings/emis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Home Loan", amount: 20000, startDate: "2026-01-01" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.emi.name).toBe("Home Loan")
    expect(body.emi.amount).toBe(20000)
  })

  it("returns 400 when name is missing", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    const req = new NextRequest("http://localhost/api/settings/emis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 20000, startDate: "2026-01-01" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 when amount is missing", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    const req = new NextRequest("http://localhost/api/settings/emis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Home Loan", startDate: "2026-01-01" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

// ─── PUT /api/settings/emis/[id] ─────────────────────────────────────────────

describe("PUT /api/settings/emis/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/emis/emi-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "emi-1" }) })
    expect(res.status).toBe(401)
  })

  it("returns 200 when EMI is updated", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.eMI.findFirst as jest.Mock).mockResolvedValue(MOCK_EMIS[0])
    ;(mockPrisma.eMI.update as jest.Mock).mockResolvedValue({
      ...MOCK_EMIS[0],
      isActive: false,
    })
    const req = new NextRequest("http://localhost/api/settings/emis/emi-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "emi-1" }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.emi.isActive).toBe(false)
  })

  it("returns 404 when EMI does not exist", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.eMI.findFirst as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/emis/nonexistent", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "nonexistent" }) })
    expect(res.status).toBe(404)
  })
})

// ─── DELETE /api/settings/emis/[id] ──────────────────────────────────────────

describe("DELETE /api/settings/emis/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/emis/emi-1", {
      method: "DELETE",
    })
    const res = await DELETE(req, { params: Promise.resolve({ id: "emi-1" }) })
    expect(res.status).toBe(401)
  })

  it("returns 200 when EMI is deleted", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.eMI.findFirst as jest.Mock).mockResolvedValue(MOCK_EMIS[0])
    ;(mockPrisma.eMI.delete as jest.Mock).mockResolvedValue(MOCK_EMIS[0])
    const req = new NextRequest("http://localhost/api/settings/emis/emi-1", {
      method: "DELETE",
    })
    const res = await DELETE(req, { params: Promise.resolve({ id: "emi-1" }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("returns 404 when EMI does not exist", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.eMI.findFirst as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/emis/nonexistent", {
      method: "DELETE",
    })
    const res = await DELETE(req, { params: Promise.resolve({ id: "nonexistent" }) })
    expect(res.status).toBe(404)
  })
})
