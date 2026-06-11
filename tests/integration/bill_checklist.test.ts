/** @jest-environment node */
/**
 * Integration tests for /api/bill-checklist routes
 */

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/db", () => ({
  prisma: {
    monthlyBill: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    monthlyBillPayment: {
      upsert: jest.fn(),
    },
  },
}))

import { GET } from "@/app/api/bill-checklist/route"
import { PUT } from "@/app/api/bill-checklist/[id]/route"
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

const MOCK_BILL = {
  id: "bill-1",
  userId: "user-1",
  name: "Electricity",
  amount: 2500,
  dueDay: 10,
  isActive: true,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("GET /api/bill-checklist", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/bill-checklist?year=2026&month=5")
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it("rejects invalid year", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    const req = new NextRequest("http://localhost/api/bill-checklist?year=1800&month=5")
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it("rejects invalid month", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    const req = new NextRequest("http://localhost/api/bill-checklist?year=2026&month=13")
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it("returns active bills with month-specific payment state", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.monthlyBill.findMany as jest.Mock).mockResolvedValue([
      {
        ...MOCK_BILL,
        payments: [{ id: "payment-1", isPaid: true, paidAt: new Date("2026-05-10"), autoChecked: true }],
      },
    ])
    const req = new NextRequest("http://localhost/api/bill-checklist?year=2026&month=5")
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items[0].isPaid).toBe(true)
    expect(body.items[0].autoChecked).toBe(true)
    expect(mockPrisma.monthlyBill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", isActive: true },
        include: { payments: { where: { userId: "user-1", year: 2026, month: 5 }, take: 1 } },
      })
    )
  })
})

describe("PUT /api/bill-checklist/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/bill-checklist/bill-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: 2026, month: 5, isPaid: true }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "bill-1" }) })
    expect(res.status).toBe(401)
  })

  it("returns 404 when bill is not owned by the user", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.monthlyBill.findFirst as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/bill-checklist/bill-2", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: 2026, month: 5, isPaid: true }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "bill-2" }) })
    expect(res.status).toBe(404)
  })

  it("marks manual toggles as not auto-checked", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.monthlyBill.findFirst as jest.Mock).mockResolvedValue(MOCK_BILL)
    ;(mockPrisma.monthlyBillPayment.upsert as jest.Mock).mockResolvedValue({})
    const req = new NextRequest("http://localhost/api/bill-checklist/bill-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: 2026, month: 5, isPaid: true }),
    })
    await PUT(req, { params: Promise.resolve({ id: "bill-1" }) })
    expect(mockPrisma.monthlyBillPayment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ autoChecked: false }),
        update: expect.objectContaining({ autoChecked: false }),
      })
    )
  })

  it("upserts the selected month payment state", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.monthlyBill.findFirst as jest.Mock).mockResolvedValue(MOCK_BILL)
    ;(mockPrisma.monthlyBillPayment.upsert as jest.Mock).mockResolvedValue({
      id: "payment-1",
      userId: "user-1",
      monthlyBillId: "bill-1",
      year: 2026,
      month: 5,
      isPaid: true,
      paidAt: new Date("2026-05-10"),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const req = new NextRequest("http://localhost/api/bill-checklist/bill-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: 2026, month: 5, isPaid: true }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "bill-1" }) })
    expect(res.status).toBe(200)
    expect(mockPrisma.monthlyBillPayment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_monthlyBillId_year_month: {
            userId: "user-1",
            monthlyBillId: "bill-1",
            year: 2026,
            month: 5,
          },
        },
      })
    )
  })
})
