/** @jest-environment node */
/**
 * Integration tests for /api/settings/budget-targets routes
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

import { GET, POST } from "@/app/api/settings/budget-targets/route"
import { PUT, DELETE } from "@/app/api/settings/budget-targets/[id]/route"
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

const MOCK_CATEGORY = { id: "cat-1", name: "Food", icon: "🍔", sortOrder: 0, userId: "user-1" }

const MOCK_TARGET = {
  id: "bt-1",
  userId: "user-1",
  categoryId: "cat-1",
  year: 2026,
  month: null,
  targetAmount: 50000,
  createdAt: new Date(),
  category: MOCK_CATEGORY,
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ─── GET /api/settings/budget-targets ────────────────────────────────────────

describe("GET /api/settings/budget-targets", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/budget-targets?year=2026")
    const res = await GET(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 200 with targets for the given year", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.budgetTarget.findMany as jest.Mock).mockResolvedValue([MOCK_TARGET])
    const req = new NextRequest("http://localhost/api/settings/budget-targets?year=2026")
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.targets).toHaveLength(1)
    expect(body.targets[0].year).toBe(2026)
  })

  it("returns 400 when year param is missing", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    const req = new NextRequest("http://localhost/api/settings/budget-targets")
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 when year param is invalid", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    const req = new NextRequest("http://localhost/api/settings/budget-targets?year=abc")
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 when year is out of range", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    const req = new NextRequest("http://localhost/api/settings/budget-targets?year=1800")
    const res = await GET(req)
    expect(res.status).toBe(400)
  })
})

// ─── POST /api/settings/budget-targets ───────────────────────────────────────

describe("POST /api/settings/budget-targets", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/budget-targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: "cat-1", year: 2026, targetAmount: 50000 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 201 when valid target is created", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.category.findFirst as jest.Mock).mockResolvedValue(MOCK_CATEGORY)
    ;(mockPrisma.budgetTarget.create as jest.Mock).mockResolvedValue(MOCK_TARGET)
    const req = new NextRequest("http://localhost/api/settings/budget-targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: "cat-1", year: 2026, targetAmount: 50000 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.target.categoryId).toBe("cat-1")
    expect(body.target.targetAmount).toBe(50000)
  })

  it("returns 404 when category does not belong to user", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.category.findFirst as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/budget-targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: "other-cat", year: 2026, targetAmount: 50000 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it("returns 400 when targetAmount is missing", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    const req = new NextRequest("http://localhost/api/settings/budget-targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: "cat-1", year: 2026 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

// ─── PUT /api/settings/budget-targets/[id] ───────────────────────────────────

describe("PUT /api/settings/budget-targets/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/budget-targets/bt-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetAmount: 60000 }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "bt-1" }) })
    expect(res.status).toBe(401)
  })

  it("returns 200 when target is updated", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.budgetTarget.findFirst as jest.Mock).mockResolvedValue(MOCK_TARGET)
    ;(mockPrisma.budgetTarget.update as jest.Mock).mockResolvedValue({
      ...MOCK_TARGET,
      targetAmount: 60000,
    })
    const req = new NextRequest("http://localhost/api/settings/budget-targets/bt-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetAmount: 60000 }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "bt-1" }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.target.targetAmount).toBe(60000)
  })

  it("returns 404 when target does not exist", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.budgetTarget.findFirst as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/budget-targets/nonexistent", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetAmount: 60000 }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "nonexistent" }) })
    expect(res.status).toBe(404)
  })
})

// ─── DELETE /api/settings/budget-targets/[id] ────────────────────────────────

describe("DELETE /api/settings/budget-targets/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/budget-targets/bt-1", {
      method: "DELETE",
    })
    const res = await DELETE(req, { params: Promise.resolve({ id: "bt-1" }) })
    expect(res.status).toBe(401)
  })

  it("returns 200 when target is deleted", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.budgetTarget.findFirst as jest.Mock).mockResolvedValue(MOCK_TARGET)
    ;(mockPrisma.budgetTarget.delete as jest.Mock).mockResolvedValue(MOCK_TARGET)
    const req = new NextRequest("http://localhost/api/settings/budget-targets/bt-1", {
      method: "DELETE",
    })
    const res = await DELETE(req, { params: Promise.resolve({ id: "bt-1" }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("returns 404 when target does not exist", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.budgetTarget.findFirst as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/budget-targets/nonexistent", {
      method: "DELETE",
    })
    const res = await DELETE(req, { params: Promise.resolve({ id: "nonexistent" }) })
    expect(res.status).toBe(404)
  })
})
