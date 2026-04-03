/** @jest-environment node */
/**
 * Integration tests for /api/passive-income (GET, POST) and /api/passive-income/[id] (DELETE)
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
    },
    category: { findMany: jest.fn(), createMany: jest.fn() },
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

import { GET, POST } from "@/app/api/passive-income/route"
import { DELETE } from "@/app/api/passive-income/[id]/route"
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

describe("GET /api/passive-income", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/passive-income?year=2026")
    const res = await GET(req)

    expect(res.status).toBe(401)
  })

  it("returns 200 with passive income entries when authenticated", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    const mockEntries = [
      {
        id: "pi-1",
        userId: "user-1",
        year: 2026,
        sourceType: "DIVIDEND",
        sourceName: "Zerodha",
        amount: 5000,
        createdAt: new Date(),
      },
    ]
    ;(mockPrisma.passiveIncome.findMany as jest.Mock).mockResolvedValue(mockEntries)

    const req = new NextRequest("http://localhost/api/passive-income?year=2026")
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body[0].id).toBe("pi-1")
  })

  it("returns 400 when year param is missing", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    const req = new NextRequest("http://localhost/api/passive-income")
    const res = await GET(req)

    expect(res.status).toBe(400)
  })
})

describe("POST /api/passive-income", () => {
  it("returns 201 when valid entry is created", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    ;(mockPrisma.passiveIncome.create as jest.Mock).mockResolvedValue({
      id: "pi-new",
      userId: "user-1",
      year: 2026,
      sourceType: "DIVIDEND",
      sourceName: "Zerodha",
      amount: 5000,
      createdAt: new Date(),
    })

    const req = new NextRequest("http://localhost/api/passive-income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: 2026,
        sourceType: "DIVIDEND",
        sourceName: "Zerodha",
        amount: 5000,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)

    const body = await res.json()
    expect(body.id).toBe("pi-new")
  })

  it("returns 400 when sourceType is invalid", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    const req = new NextRequest("http://localhost/api/passive-income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: 2026,
        sourceType: "INVALID_SOURCE",
        sourceName: "Zerodha",
        amount: 5000,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/passive-income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: 2026,
        sourceType: "DIVIDEND",
        sourceName: "Zerodha",
        amount: 5000,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})

describe("DELETE /api/passive-income/[id]", () => {
  it("returns 200 when deleting own entry", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    ;(mockPrisma.passiveIncome.findUnique as jest.Mock).mockResolvedValue({
      id: "pi-1",
      userId: "user-1",
    })
    ;(mockPrisma.passiveIncome.delete as jest.Mock).mockResolvedValue({ id: "pi-1" })

    const req = new NextRequest("http://localhost/api/passive-income/pi-1", {
      method: "DELETE",
    })

    const res = await DELETE(req, { params: { id: "pi-1" } })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("returns 404 when entry does not exist", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    ;(mockPrisma.passiveIncome.findUnique as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/passive-income/nonexistent", {
      method: "DELETE",
    })

    const res = await DELETE(req, { params: { id: "nonexistent" } })
    expect(res.status).toBe(404)
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/passive-income/pi-1", {
      method: "DELETE",
    })

    const res = await DELETE(req, { params: { id: "pi-1" } })
    expect(res.status).toBe(401)
  })
})
