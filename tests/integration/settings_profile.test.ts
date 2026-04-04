/** @jest-environment node */
/**
 * Integration tests for /api/settings/profile (PUT) and /api/settings/password (PUT)
 */

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("bcrypt", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
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

import { PUT as profilePUT } from "@/app/api/settings/profile/route"
import { PUT as passwordPUT } from "@/app/api/settings/password/route"
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcrypt"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = auth as jest.MockedFunction<any>
const mockPrisma = prisma as jest.Mocked<typeof prisma>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockBcrypt = bcrypt as any

const MOCK_SESSION = {
  user: { id: "user-1", name: "Test User", email: "test@test.com" },
  expires: "2099-01-01",
} as any

beforeEach(() => {
  jest.clearAllMocks()
})

// ─── Profile PUT ─────────────────────────────────────────────────────────────

describe("PUT /api/settings/profile", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Name" }),
    })
    const res = await profilePUT(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 200 and updated user when name is valid", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.user.update as jest.Mock).mockResolvedValue({
      id: "user-1",
      name: "New Name",
      email: "test@test.com",
    })
    const req = new NextRequest("http://localhost/api/settings/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Name" }),
    })
    const res = await profilePUT(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.name).toBe("New Name")
  })

  it("returns 400 when name is too short", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    const req = new NextRequest("http://localhost/api/settings/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "A" }),
    })
    const res = await profilePUT(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 when name is missing", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    const req = new NextRequest("http://localhost/api/settings/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    const res = await profilePUT(req)
    expect(res.status).toBe(400)
  })
})

// ─── Password PUT ─────────────────────────────────────────────────────────────

describe("PUT /api/settings/password", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: "OldPass1",
        newPassword: "NewPass1",
        confirmPassword: "NewPass1",
      }),
    })
    const res = await passwordPUT(req)
    expect(res.status).toBe(401)
  })

  it("returns 200 when password change is successful", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      passwordHash: "hashed_old",
    })
    mockBcrypt.compare.mockResolvedValue(true)
    mockBcrypt.hash.mockResolvedValue("hashed_new")
    ;(mockPrisma.user.update as jest.Mock).mockResolvedValue({ id: "user-1" })

    const req = new NextRequest("http://localhost/api/settings/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: "OldPass1",
        newPassword: "NewPass1",
        confirmPassword: "NewPass1",
      }),
    })
    const res = await passwordPUT(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBe("Password updated successfully")
  })

  it("returns 400 when current password is incorrect", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      passwordHash: "hashed_old",
    })
    mockBcrypt.compare.mockResolvedValue(false)

    const req = new NextRequest("http://localhost/api/settings/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: "WrongPass1",
        newPassword: "NewPass1",
        confirmPassword: "NewPass1",
      }),
    })
    const res = await passwordPUT(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Current password is incorrect")
  })

  it("returns 400 when new passwords do not match", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      passwordHash: "hashed_old",
    })
    mockBcrypt.compare.mockResolvedValue(true)

    const req = new NextRequest("http://localhost/api/settings/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: "OldPass1",
        newPassword: "NewPass1",
        confirmPassword: "DifferentPass1",
      }),
    })
    const res = await passwordPUT(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("New passwords do not match")
  })

  it("returns 400 when new password is too weak", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    const req = new NextRequest("http://localhost/api/settings/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: "OldPass1",
        newPassword: "weak",
        confirmPassword: "weak",
      }),
    })
    const res = await passwordPUT(req)
    expect(res.status).toBe(400)
  })
})
