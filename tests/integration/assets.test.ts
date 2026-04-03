/** @jest-environment node */
/**
 * Integration tests for /api/assets (GET, POST) and /api/assets/[id] (DELETE)
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

import { GET, POST } from "@/app/api/assets/route"
import { DELETE } from "@/app/api/assets/[id]/route"
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

const MOCK_SESSION = {
  user: { id: "user-1", name: "Test User", email: "test@test.com" },
  expires: "2099-01-01",
} as Awaited<ReturnType<typeof auth>>

beforeEach(() => {
  jest.clearAllMocks()
})

describe("GET /api/assets", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    // GET has no params so we pass an empty NextRequest-compatible call
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns 200 with assets array when authenticated", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    const mockAssets = [
      {
        id: "asset-1",
        userId: "user-1",
        assetType: "PPF",
        assetName: "PPF Account",
        currentValue: 200000,
        investedAmount: 150000,
        recordedDate: new Date("2026-01-01"),
        notes: null,
        createdAt: new Date(),
      },
    ]
    ;(mockPrisma.asset.findMany as jest.Mock).mockResolvedValue(mockAssets)

    const res = await GET()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body[0].id).toBe("asset-1")
  })
})

describe("POST /api/assets", () => {
  it("returns 201 when valid asset is created", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    ;(mockPrisma.asset.create as jest.Mock).mockResolvedValue({
      id: "asset-new",
      userId: "user-1",
      assetType: "STOCKS",
      assetName: "Zerodha Portfolio",
      currentValue: 50000,
      investedAmount: 40000,
      recordedDate: new Date("2026-04-01"),
      notes: null,
      createdAt: new Date(),
    })

    const req = new NextRequest("http://localhost/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordedDate: "2026-04-01",
        assetType: "STOCKS",
        assetName: "Zerodha Portfolio",
        currentValue: 50000,
        investedAmount: 40000,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)

    const body = await res.json()
    expect(body.id).toBe("asset-new")
  })

  it("returns 400 when assetName is missing", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    const req = new NextRequest("http://localhost/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordedDate: "2026-04-01",
        assetType: "STOCKS",
        // assetName intentionally omitted
        currentValue: 50000,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordedDate: "2026-04-01",
        assetType: "STOCKS",
        assetName: "Zerodha",
        currentValue: 50000,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})

describe("DELETE /api/assets/[id]", () => {
  it("returns 200 when deleting own asset", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    ;(mockPrisma.asset.findUnique as jest.Mock).mockResolvedValue({
      id: "asset-1",
      userId: "user-1",
    })
    ;(mockPrisma.asset.delete as jest.Mock).mockResolvedValue({ id: "asset-1" })

    const req = new NextRequest("http://localhost/api/assets/asset-1", {
      method: "DELETE",
    })

    const res = await DELETE(req, { params: { id: "asset-1" } })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("returns 404 when asset does not exist", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    ;(mockPrisma.asset.findUnique as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/assets/nonexistent", {
      method: "DELETE",
    })

    const res = await DELETE(req, { params: { id: "nonexistent" } })
    expect(res.status).toBe(404)
  })

  it("returns 404 when asset belongs to another user", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    ;(mockPrisma.asset.findUnique as jest.Mock).mockResolvedValue({
      id: "asset-1",
      userId: "other-user",
    })

    const req = new NextRequest("http://localhost/api/assets/asset-1", {
      method: "DELETE",
    })

    const res = await DELETE(req, { params: { id: "asset-1" } })
    // assets/[id]/route.ts returns 404 (not 403) for cross-user access — by design
    expect(res.status).toBe(404)
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/assets/asset-1", {
      method: "DELETE",
    })

    const res = await DELETE(req, { params: { id: "asset-1" } })
    expect(res.status).toBe(401)
  })
})
