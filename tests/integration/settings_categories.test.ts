/** @jest-environment node */
/**
 * Integration tests for /api/settings/categories routes
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

import { GET, POST } from "@/app/api/settings/categories/route"
import { PUT, DELETE } from "@/app/api/settings/categories/[id]/route"
import { PUT as reorderPUT } from "@/app/api/settings/categories/reorder/route"
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
  { id: "cat-1", name: "Food", icon: "🍔", sortOrder: 0, userId: "user-1", isDefault: true },
  { id: "cat-2", name: "Transport", icon: "🚗", sortOrder: 1, userId: "user-1", isDefault: true },
]

beforeEach(() => {
  jest.clearAllMocks()
})

// ─── GET /api/settings/categories ────────────────────────────────────────────

describe("GET /api/settings/categories", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/categories")
    const res = await GET(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 200 with categories array when authenticated", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.category.findMany as jest.Mock).mockResolvedValue(MOCK_CATEGORIES)
    const req = new NextRequest("http://localhost/api/settings/categories")
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.categories).toHaveLength(2)
    expect(body.categories[0].name).toBe("Food")
  })
})

// ─── POST /api/settings/categories ───────────────────────────────────────────

describe("POST /api/settings/categories", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Travel", icon: "✈️" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 201 when valid category is created", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.category.findMany as jest.Mock).mockResolvedValue(MOCK_CATEGORIES)
    ;(mockPrisma.category.create as jest.Mock).mockResolvedValue({
      id: "cat-3",
      name: "Travel",
      icon: "✈️",
      sortOrder: 2,
      userId: "user-1",
    })
    const req = new NextRequest("http://localhost/api/settings/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Travel", icon: "✈️" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.category.name).toBe("Travel")
  })

  it("returns 400 when name is missing", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    const req = new NextRequest("http://localhost/api/settings/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ icon: "✈️" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

// ─── PUT /api/settings/categories/[id] ───────────────────────────────────────

describe("PUT /api/settings/categories/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/categories/cat-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated Food" }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "cat-1" }) })
    expect(res.status).toBe(401)
  })

  it("returns 200 when category is updated", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.category.findFirst as jest.Mock).mockResolvedValue(MOCK_CATEGORIES[0])
    ;(mockPrisma.category.update as jest.Mock).mockResolvedValue({
      ...MOCK_CATEGORIES[0],
      name: "Updated Food",
    })
    const req = new NextRequest("http://localhost/api/settings/categories/cat-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated Food" }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "cat-1" }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.category.name).toBe("Updated Food")
  })

  it("returns 404 when category does not exist", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.category.findFirst as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/categories/nonexistent", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test" }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "nonexistent" }) })
    expect(res.status).toBe(404)
  })
})

// ─── DELETE /api/settings/categories/[id] ────────────────────────────────────

describe("DELETE /api/settings/categories/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/categories/cat-1", {
      method: "DELETE",
    })
    const res = await DELETE(req, { params: Promise.resolve({ id: "cat-1" }) })
    expect(res.status).toBe(401)
  })

  it("returns 200 when category is deleted", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.category.findFirst as jest.Mock).mockResolvedValue(MOCK_CATEGORIES[0])
    ;(mockPrisma.transaction.count as jest.Mock).mockResolvedValue(0)
    ;(mockPrisma.category.delete as jest.Mock).mockResolvedValue(MOCK_CATEGORIES[0])
    const req = new NextRequest("http://localhost/api/settings/categories/cat-1", {
      method: "DELETE",
    })
    const res = await DELETE(req, { params: Promise.resolve({ id: "cat-1" }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("returns 409 when category has transactions", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.category.findFirst as jest.Mock).mockResolvedValue(MOCK_CATEGORIES[0])
    ;(mockPrisma.transaction.count as jest.Mock).mockResolvedValue(3)
    const req = new NextRequest("http://localhost/api/settings/categories/cat-1", {
      method: "DELETE",
    })
    const res = await DELETE(req, { params: Promise.resolve({ id: "cat-1" }) })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain("transactions")
  })

  it("returns 404 when category does not exist", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.category.findFirst as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/categories/nonexistent", {
      method: "DELETE",
    })
    const res = await DELETE(req, { params: Promise.resolve({ id: "nonexistent" }) })
    expect(res.status).toBe(404)
  })
})

// ─── PUT /api/settings/categories/reorder ────────────────────────────────────

describe("PUT /api/settings/categories/reorder", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/categories/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ["cat-2", "cat-1"] }),
    })
    const res = await reorderPUT(req)
    expect(res.status).toBe(401)
  })

  it("returns 200 when reorder is successful", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.category.update as jest.Mock).mockResolvedValue({})
    const req = new NextRequest("http://localhost/api/settings/categories/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ["cat-2", "cat-1"] }),
    })
    const res = await reorderPUT(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(mockPrisma.category.update).toHaveBeenCalledTimes(2)
  })

  it("returns 400 when ids array is missing", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    const req = new NextRequest("http://localhost/api/settings/categories/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    const res = await reorderPUT(req)
    expect(res.status).toBe(400)
  })
})
