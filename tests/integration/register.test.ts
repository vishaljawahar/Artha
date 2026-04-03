/** @jest-environment node */
/**
 * Integration tests for POST /api/user/register
 *
 * NextRequest is available because Next.js 14 polyfills it at test time via next/jest.
 * If tests fail with "NextRequest is not defined", ensure jest.config.ts uses
 * `nextJest({ dir: "./" })` which sets up the Next.js test environment.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
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

import { POST } from "@/app/api/user/register/route"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"

const mockPrisma = prisma as jest.Mocked<typeof prisma>

function makeRegisterRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/user/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/user/register", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns 201 when registration data is valid and user does not exist", async () => {
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        user: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn().mockResolvedValue({
            id: "user-1",
            name: "Vishal",
            email: "vishal@example.com",
            role: "ADMIN",
          }),
        },
        category: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      }
      return fn(tx as unknown as typeof prisma)
    })

    const req = makeRegisterRequest({
      name: "Vishal",
      email: "vishal@example.com",
      password: "Password1",
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body).toHaveProperty("userId", "user-1")
    expect(body).toHaveProperty("message")
  })

  it("returns 400 when email is invalid", async () => {
    const req = makeRegisterRequest({
      name: "Vishal",
      email: "not-an-email",
      password: "Password1",
    })

    const res = await POST(req)
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body).toHaveProperty("error")
  })

  it("returns 400 when password is too weak (no uppercase)", async () => {
    const req = makeRegisterRequest({
      name: "Vishal",
      email: "vishal@example.com",
      password: "password1",
    })

    const res = await POST(req)
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.error).toMatch(/uppercase/)
  })

  it("returns 400 when password has no number", async () => {
    const req = makeRegisterRequest({
      name: "Vishal",
      email: "vishal@example.com",
      password: "PasswordOnly",
    })

    const res = await POST(req)
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.error).toMatch(/number/)
  })

  it("returns 409 when email already exists", async () => {
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "existing-user",
      email: "vishal@example.com",
    })

    const req = makeRegisterRequest({
      name: "Vishal",
      email: "vishal@example.com",
      password: "Password1",
    })

    const res = await POST(req)
    expect(res.status).toBe(409)

    const body = await res.json()
    expect(body).toHaveProperty("error")
    expect(body.error).toMatch(/already exists/)
  })
})
