/** @jest-environment node */
/**
 * Integration tests for /api/annual-entries (GET, POST) and /api/annual-entries/[id] (DELETE)
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

import { GET, POST } from "@/app/api/annual-entries/route"
import { DELETE } from "@/app/api/annual-entries/[id]/route"
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

describe("GET /api/annual-entries", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/annual-entries?year=2026")
    const res = await GET(req)

    expect(res.status).toBe(401)
  })

  it("returns 200 with entries array when authenticated", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    const mockEntries = [
      {
        id: "entry-1",
        userId: "user-1",
        year: 2026,
        entryType: "ASSET",
        category: "Investments",
        particulars: "PPF",
        amount: 150000,
        createdAt: new Date(),
      },
    ]
    ;(mockPrisma.annualEntry.findMany as jest.Mock).mockResolvedValue(mockEntries)

    const req = new NextRequest("http://localhost/api/annual-entries?year=2026")
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty("entries")
    expect(Array.isArray(body.entries)).toBe(true)
    expect(body.entries[0].id).toBe("entry-1")
  })
})

describe("POST /api/annual-entries", () => {
  it("returns 201 when valid entry is created", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    ;(mockPrisma.annualEntry.create as jest.Mock).mockResolvedValue({
      id: "entry-new",
      userId: "user-1",
      year: 2026,
      entryType: "ASSET",
      category: "Investments",
      particulars: "PPF",
      amount: 150000,
      createdAt: new Date(),
    })

    const req = new NextRequest("http://localhost/api/annual-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: 2026,
        entryType: "ASSET",
        category: "Investments",
        particulars: "PPF",
        amount: 150000,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)

    const body = await res.json()
    expect(body).toHaveProperty("entry")
    expect(body.entry.id).toBe("entry-new")
  })

  it("returns 400 when entryType is invalid", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    const req = new NextRequest("http://localhost/api/annual-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: 2026,
        entryType: "INVALID_TYPE",
        category: "Investments",
        particulars: "PPF",
        amount: 150000,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/annual-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: 2026,
        entryType: "ASSET",
        category: "Investments",
        particulars: "PPF",
        amount: 150000,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})

describe("DELETE /api/annual-entries/[id]", () => {
  it("returns 200 when deleting own entry", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    ;(mockPrisma.annualEntry.findUnique as jest.Mock).mockResolvedValue({
      id: "entry-1",
      userId: "user-1",
    })
    ;(mockPrisma.annualEntry.delete as jest.Mock).mockResolvedValue({ id: "entry-1" })

    const req = new NextRequest("http://localhost/api/annual-entries/entry-1", {
      method: "DELETE",
    })

    const res = await DELETE(req, { params: Promise.resolve({ id: "entry-1" }) })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("returns 404 when entry does not exist", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    ;(mockPrisma.annualEntry.findUnique as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/annual-entries/nonexistent", {
      method: "DELETE",
    })

    const res = await DELETE(req, { params: Promise.resolve({ id: "nonexistent" }) })
    expect(res.status).toBe(404)
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/annual-entries/entry-1", {
      method: "DELETE",
    })

    const res = await DELETE(req, { params: Promise.resolve({ id: "entry-1" }) })
    expect(res.status).toBe(401)
  })
})
