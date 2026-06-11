/** @jest-environment node */
/**
 * Integration tests for /api/settings/monthly-bills routes
 */

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/db", () => ({
  prisma: {
    monthlyBill: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock("@/lib/bill-matching", () => ({ safeRecomputeBillPayment: jest.fn().mockResolvedValue(undefined) }))

import { GET, POST, PUT as REORDER } from "@/app/api/settings/monthly-bills/route"
import { PUT, DELETE } from "@/app/api/settings/monthly-bills/[id]/route"
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { safeRecomputeBillPayment } from "@/lib/bill-matching"

const mockRecompute = safeRecomputeBillPayment as jest.MockedFunction<typeof safeRecomputeBillPayment>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = auth as jest.MockedFunction<any>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

const MOCK_SESSION = {
  user: { id: "user-1", name: "Test User", email: "test@test.com" },
  expires: "2099-01-01",
} as any

const MOCK_BILL = {
  id: "bill-1",
  userId: "user-1",
  name: "Electricity",
  amount: 2500,
  dueDay: 10,
  isActive: true,
  sortOrder: 0,
  matchCategoryId: null,
  matchKeyword: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("GET /api/settings/monthly-bills", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/monthly-bills")
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it("returns bills for the authenticated user", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.monthlyBill.findMany as jest.Mock).mockResolvedValue([MOCK_BILL])
    const req = new NextRequest("http://localhost/api/settings/monthly-bills")
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.bills[0].name).toBe("Electricity")
    expect(mockPrisma.monthlyBill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } })
    )
  })
})

describe("POST /api/settings/monthly-bills", () => {
  it("creates a bill with valid input", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.monthlyBill.count as jest.Mock).mockResolvedValue(0)
    ;(mockPrisma.monthlyBill.create as jest.Mock).mockResolvedValue(MOCK_BILL)
    const req = new NextRequest("http://localhost/api/settings/monthly-bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Electricity", amount: 2500, dueDay: 10 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.bill.amount).toBe(2500)
  })

  it("creates a bill with optional amount and due day omitted", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.monthlyBill.count as jest.Mock).mockResolvedValue(0)
    ;(mockPrisma.monthlyBill.create as jest.Mock).mockResolvedValue({
      ...MOCK_BILL,
      amount: null,
      dueDay: null,
    })
    const req = new NextRequest("http://localhost/api/settings/monthly-bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Internet", amount: null, dueDay: null }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.bill.amount).toBeNull()
    expect(body.bill.dueDay).toBeNull()
  })

  it("rejects an invalid due day", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    const req = new NextRequest("http://localhost/api/settings/monthly-bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Electricity", amount: 2500, dueDay: 32 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe("PUT /api/settings/monthly-bills/[id]", () => {
  it("updates only a bill owned by the user", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.monthlyBill.findFirst as jest.Mock).mockResolvedValue(MOCK_BILL)
    ;(mockPrisma.monthlyBill.update as jest.Mock).mockResolvedValue({ ...MOCK_BILL, isActive: false })
    const req = new NextRequest("http://localhost/api/settings/monthly-bills/bill-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "bill-1" }) })
    expect(res.status).toBe(200)
    expect(mockPrisma.monthlyBill.findFirst).toHaveBeenCalledWith({ where: { id: "bill-1", userId: "user-1" } })
  })

  it("returns 404 when bill is not owned by the user", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.monthlyBill.findFirst as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/monthly-bills/bill-2", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "bill-2" }) })
    expect(res.status).toBe(404)
  })
})

describe("DELETE /api/settings/monthly-bills/[id]", () => {
  it("deletes only a bill owned by the user", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.monthlyBill.findFirst as jest.Mock).mockResolvedValue(MOCK_BILL)
    ;(mockPrisma.monthlyBill.delete as jest.Mock).mockResolvedValue(MOCK_BILL)
    const req = new NextRequest("http://localhost/api/settings/monthly-bills/bill-1", { method: "DELETE" })
    const res = await DELETE(req, { params: Promise.resolve({ id: "bill-1" }) })
    expect(res.status).toBe(200)
  })
})

describe("PUT /api/settings/monthly-bills", () => {
  it("reorders bills owned by the user", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.monthlyBill.findMany as jest.Mock).mockResolvedValue([{ id: "bill-1" }, { id: "bill-2" }])
    ;(mockPrisma.$transaction as jest.Mock).mockResolvedValue([])
    ;(mockPrisma.monthlyBill.update as jest.Mock).mockReturnValue({})
    const req = new NextRequest("http://localhost/api/settings/monthly-bills", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ["bill-1", "bill-2"] }),
    })
    const res = await REORDER(req)
    expect(res.status).toBe(200)
    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })
})

describe("auto-check rules", () => {
  it("rejects a rule whose category is not owned by the user", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.category.findFirst as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/monthly-bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Electricity", matchCategoryId: "cat-x", matchKeyword: "bescom" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it("creates a bill with a rule and recomputes the current month", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.category.findFirst as jest.Mock).mockResolvedValue({ id: "cat-1", userId: "user-1" })
    ;(mockPrisma.monthlyBill.count as jest.Mock).mockResolvedValue(0)
    ;(mockPrisma.monthlyBill.create as jest.Mock).mockResolvedValue({
      id: "bill-1", userId: "user-1", name: "Electricity", amount: null, dueDay: null,
      isActive: true, sortOrder: 0, matchCategoryId: "cat-1", matchKeyword: "bescom",
      createdAt: new Date(), updatedAt: new Date(),
    })
    const req = new NextRequest("http://localhost/api/settings/monthly-bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Electricity", matchCategoryId: "cat-1", matchKeyword: "bescom" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(mockPrisma.monthlyBill.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ matchCategoryId: "cat-1", matchKeyword: "bescom" }),
      })
    )
    const now = new Date()
    expect(mockRecompute).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ id: "bill-1", matchCategoryId: "cat-1" }),
      now.getFullYear(),
      now.getMonth() + 1
    )
  })

  it("recomputes when the rule changes on update", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.monthlyBill.findFirst as jest.Mock).mockResolvedValue({
      ...MOCK_BILL, matchCategoryId: null, matchKeyword: null,
    })
    ;(mockPrisma.category.findFirst as jest.Mock).mockResolvedValue({ id: "cat-1", userId: "user-1" })
    ;(mockPrisma.monthlyBill.update as jest.Mock).mockResolvedValue({
      ...MOCK_BILL, matchCategoryId: "cat-1", matchKeyword: null,
    })
    const req = new NextRequest("http://localhost/api/settings/monthly-bills/bill-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchCategoryId: "cat-1", matchKeyword: "" }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "bill-1" }) })
    expect(res.status).toBe(200)
    expect(mockRecompute).toHaveBeenCalledTimes(1)
  })

  it("does not recompute when the rule is unchanged", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.monthlyBill.findFirst as jest.Mock).mockResolvedValue(MOCK_BILL)
    ;(mockPrisma.monthlyBill.update as jest.Mock).mockResolvedValue(MOCK_BILL)
    const req = new NextRequest("http://localhost/api/settings/monthly-bills/bill-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "bill-1" }) })
    expect(res.status).toBe(200)
    expect(mockRecompute).not.toHaveBeenCalled()
  })
})
