/** @jest-environment node */
/**
 * Unit tests for the shared-resource loan access helpers in src/lib/loan-access.ts.
 * The Prisma client is mocked so these run without a database.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    loanMember: {
      findUnique: jest.fn(),
    },
  },
}))

import { getLoanMembership, assertMember, assertOwner } from "@/lib/loan-access"
import { prisma } from "@/lib/db"

const mockFindUnique = prisma.loanMember.findUnique as jest.Mock

const OWNER_MEMBERSHIP = {
  id: "lm-1",
  loanId: "loan-1",
  userId: "user-1",
  role: "OWNER",
  joinedAt: new Date("2026-01-01"),
}

const MEMBER_MEMBERSHIP = {
  id: "lm-2",
  loanId: "loan-1",
  userId: "user-2",
  role: "MEMBER",
  joinedAt: new Date("2026-01-02"),
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("getLoanMembership", () => {
  it("queries on the loanId_userId compound key and returns the membership", async () => {
    mockFindUnique.mockResolvedValue(OWNER_MEMBERSHIP)

    const result = await getLoanMembership("loan-1", "user-1")

    expect(result).toEqual(OWNER_MEMBERSHIP)
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { loanId_userId: { loanId: "loan-1", userId: "user-1" } },
    })
  })

  it("returns null when the user is not a member", async () => {
    mockFindUnique.mockResolvedValue(null)

    const result = await getLoanMembership("loan-1", "stranger")
    expect(result).toBeNull()
  })
})

describe("assertMember", () => {
  it("returns the membership when the user is a member", async () => {
    mockFindUnique.mockResolvedValue(MEMBER_MEMBERSHIP)

    const result = await assertMember("loan-1", "user-2")
    expect(result).toEqual(MEMBER_MEMBERSHIP)
  })

  it("returns null when the user is not a member", async () => {
    mockFindUnique.mockResolvedValue(null)

    const result = await assertMember("loan-1", "stranger")
    expect(result).toBeNull()
  })
})

describe("assertOwner", () => {
  it("returns the membership when the user is an OWNER", async () => {
    mockFindUnique.mockResolvedValue(OWNER_MEMBERSHIP)

    const result = await assertOwner("loan-1", "user-1")
    expect(result).toEqual(OWNER_MEMBERSHIP)
  })

  it("returns null when the user is a MEMBER (not an OWNER)", async () => {
    mockFindUnique.mockResolvedValue(MEMBER_MEMBERSHIP)

    const result = await assertOwner("loan-1", "user-2")
    expect(result).toBeNull()
  })

  it("returns null when the user is not a member at all", async () => {
    mockFindUnique.mockResolvedValue(null)

    const result = await assertOwner("loan-1", "stranger")
    expect(result).toBeNull()
  })
})
