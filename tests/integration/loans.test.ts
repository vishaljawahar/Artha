/** @jest-environment node */
/**
 * Integration tests for /api/loans/** routes.
 *
 * Loans use MEMBERSHIP-based isolation (not the per-row userId rule). All
 * authorization flows through prisma.loanMember.findUnique via the helpers in
 * src/lib/loan-access.ts, so mocking that controls membership/ownership.
 */

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/db", () => ({
  prisma: {
    loan: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    loanMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    loanPayment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    emiEntry: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    loanDisbursement: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}))

import { POST as createLoan } from "@/app/api/loans/route"
import { GET as getLoan, PUT as updateLoan, DELETE as deleteLoan } from "@/app/api/loans/[id]/route"
import { POST as addMember } from "@/app/api/loans/[id]/members/route"
import { DELETE as removeMember } from "@/app/api/loans/[id]/members/[memberId]/route"
import { POST as createPayment } from "@/app/api/loans/[id]/payments/route"
import { GET as getEmis, POST as upsertEmi } from "@/app/api/loans/[id]/emis/route"
import { POST as createDisbursement } from "@/app/api/loans/[id]/disbursements/route"
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

// A fake LoanMember row to feed loanMember.findUnique.
function mockMember(role = "MEMBER", userId = "user-1", loanId = "loan-1") {
  return {
    id: `member-${userId}`,
    loanId,
    userId,
    role,
    joinedAt: new Date("2026-01-01"),
  } as any
}

// A loan row shaped for the GET-detail include (nested arrays the summary needs).
function mockLoanWithRelations() {
  return {
    id: "loan-1",
    name: "Home Loan",
    lender: "HDFC",
    loanType: "HOME",
    sanctionedAmount: 1000000,
    interestRate: 8.5,
    tenureMonths: 240,
    plannedEmiAmount: 9000,
    startDate: new Date("2026-01-01"),
    notes: null,
    createdById: "user-1",
    createdAt: new Date(),
    members: [{ userId: "user-1", user: { id: "user-1", name: "Test User", email: "test@test.com" } }],
    payments: [],
    emiEntries: [],
    disbursements: [],
  } as any
}

function jsonReq(url: string, body: unknown, method = "POST") {
  // GET/HEAD requests cannot carry a body.
  if (method === "GET" || method === "HEAD") {
    return new NextRequest(url, { method })
  }
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Isolation — the core guarantee
// ---------------------------------------------------------------------------
describe("GET /api/loans/[id] — membership isolation", () => {
  it("returns 404 for an authenticated NON-member (headline isolation test)", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.loanMember.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await getLoan(jsonReq("http://localhost/api/loans/loan-1", {}, "GET"), {
      params: Promise.resolve({ id: "loan-1" }),
    })

    expect(res.status).toBe(404)
    // loan.findUnique must never run for a non-member (no existence leak).
    expect(mockPrisma.loan.findUnique).not.toHaveBeenCalled()
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const res = await getLoan(jsonReq("http://localhost/api/loans/loan-1", {}, "GET"), {
      params: Promise.resolve({ id: "loan-1" }),
    })

    expect(res.status).toBe(401)
  })

  it("returns 200 with loan + summary + currentUserId for a member", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.loanMember.findUnique as jest.Mock).mockResolvedValue(mockMember("MEMBER"))
    ;(mockPrisma.loan.findUnique as jest.Mock).mockResolvedValue(mockLoanWithRelations())

    const res = await getLoan(jsonReq("http://localhost/api/loans/loan-1", {}, "GET"), {
      params: Promise.resolve({ id: "loan-1" }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe("loan-1")
    expect(body.currentUserId).toBe("user-1")
    expect(body.summary).toBeDefined()
    expect(body.summary.contributions).toBeDefined()
    expect(body.summary.progress).toBeDefined()
  })

  it("returns 404 when the member exists but the loan row is gone", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.loanMember.findUnique as jest.Mock).mockResolvedValue(mockMember("MEMBER"))
    ;(mockPrisma.loan.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await getLoan(jsonReq("http://localhost/api/loans/loan-1", {}, "GET"), {
      params: Promise.resolve({ id: "loan-1" }),
    })

    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// POST /api/loans (create)
// ---------------------------------------------------------------------------
describe("POST /api/loans", () => {
  it("creates a loan + OWNER membership in a transaction → 201", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    // Interactive transaction: run the callback against the same mock.
    ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb) => cb(mockPrisma))
    ;(mockPrisma.loan.create as jest.Mock).mockResolvedValue({ id: "loan-new", name: "Car Loan" })
    ;(mockPrisma.loanMember.create as jest.Mock).mockResolvedValue(mockMember("OWNER", "user-1", "loan-new"))

    const res = await createLoan(jsonReq("http://localhost/api/loans", { name: "Car Loan" }))

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("loan-new")
    expect(mockPrisma.loanMember.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: "OWNER", userId: "user-1" }) })
    )
  })

  it("returns 400 when name is missing", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)

    const res = await createLoan(jsonReq("http://localhost/api/loans", { lender: "HDFC" }))

    expect(res.status).toBe(400)
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const res = await createLoan(jsonReq("http://localhost/api/loans", { name: "Car Loan" }))

    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// Owner-only actions (PUT / DELETE loan)
// ---------------------------------------------------------------------------
describe("PUT /api/loans/[id] — owner only", () => {
  it("returns 403 for a member who is not an owner", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    // assertMember (member) then assertOwner (role MEMBER → null) — same row.
    ;(mockPrisma.loanMember.findUnique as jest.Mock).mockResolvedValue(mockMember("MEMBER"))

    const res = await updateLoan(jsonReq("http://localhost/api/loans/loan-1", { name: "Renamed" }, "PUT"), {
      params: Promise.resolve({ id: "loan-1" }),
    })

    expect(res.status).toBe(403)
    expect(mockPrisma.loan.update).not.toHaveBeenCalled()
  })

  it("returns 200 for an owner updating the loan", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.loanMember.findUnique as jest.Mock).mockResolvedValue(mockMember("OWNER"))
    ;(mockPrisma.loan.update as jest.Mock).mockResolvedValue({ id: "loan-1", name: "Renamed" })

    const res = await updateLoan(jsonReq("http://localhost/api/loans/loan-1", { name: "Renamed" }, "PUT"), {
      params: Promise.resolve({ id: "loan-1" }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe("Renamed")
  })
})

describe("DELETE /api/loans/[id] — owner only", () => {
  it("returns 404 for a non-member", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.loanMember.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await deleteLoan(jsonReq("http://localhost/api/loans/loan-1", {}, "DELETE"), {
      params: Promise.resolve({ id: "loan-1" }),
    })

    expect(res.status).toBe(404)
    expect(mockPrisma.loan.delete).not.toHaveBeenCalled()
  })

  it("returns 200 for an owner", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.loanMember.findUnique as jest.Mock).mockResolvedValue(mockMember("OWNER"))
    ;(mockPrisma.loan.delete as jest.Mock).mockResolvedValue({ id: "loan-1" })

    const res = await deleteLoan(jsonReq("http://localhost/api/loans/loan-1", {}, "DELETE"), {
      params: Promise.resolve({ id: "loan-1" }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Add member by email (owner only)
// ---------------------------------------------------------------------------
describe("POST /api/loans/[id]/members — add member by email", () => {
  it("returns 403 when caller is a member but not an owner", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    // Both assertMember and assertOwner read the caller's membership (MEMBER).
    ;(mockPrisma.loanMember.findUnique as jest.Mock).mockResolvedValue(mockMember("MEMBER"))

    const res = await addMember(jsonReq("http://localhost/api/loans/loan-1/members", { email: "x@y.com" }), {
      params: Promise.resolve({ id: "loan-1" }),
    })

    expect(res.status).toBe(403)
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
  })

  it("returns 404 when no Artha account matches the email", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    // caller membership (OWNER) for both assertMember + assertOwner.
    ;(mockPrisma.loanMember.findUnique as jest.Mock).mockResolvedValue(mockMember("OWNER"))
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await addMember(jsonReq("http://localhost/api/loans/loan-1/members", { email: "nobody@y.com" }), {
      params: Promise.resolve({ id: "loan-1" }),
    })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe("No Artha account with that email")
  })

  it("returns 409 when the target user is already a member", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    // Call order: assertMember(caller), assertOwner(caller), then target dup-check.
    ;(mockPrisma.loanMember.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockMember("OWNER")) // assertMember
      .mockResolvedValueOnce(mockMember("OWNER")) // assertOwner
      .mockResolvedValueOnce(mockMember("MEMBER", "user-2")) // target dup-check → existing
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "user-2" })

    const res = await addMember(jsonReq("http://localhost/api/loans/loan-1/members", { email: "u2@y.com" }), {
      params: Promise.resolve({ id: "loan-1" }),
    })

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe("Already a member")
    expect(mockPrisma.loanMember.create).not.toHaveBeenCalled()
  })

  it("returns 201 when adding a valid new member", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.loanMember.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockMember("OWNER")) // assertMember
      .mockResolvedValueOnce(mockMember("OWNER")) // assertOwner
      .mockResolvedValueOnce(null) // target dup-check → not yet a member
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "user-2" })
    ;(mockPrisma.loanMember.create as jest.Mock).mockResolvedValue({
      id: "member-new",
      loanId: "loan-1",
      userId: "user-2",
      role: "MEMBER",
      user: { id: "user-2", name: "Spouse", email: "u2@y.com" },
    })

    const res = await addMember(jsonReq("http://localhost/api/loans/loan-1/members", { email: "u2@y.com" }), {
      params: Promise.resolve({ id: "loan-1" }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("member-new")
    expect(body.role).toBe("MEMBER")
  })
})

// ---------------------------------------------------------------------------
// Remove member — last-owner protection
// ---------------------------------------------------------------------------
describe("DELETE /api/loans/[id]/members/[memberId] — last-owner protection", () => {
  it("returns 400 when removing the last remaining OWNER", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    // caller membership (OWNER) for assertMember + assertOwner.
    ;(mockPrisma.loanMember.findUnique as jest.Mock).mockResolvedValue(mockMember("OWNER"))
    // target row being removed is an OWNER belonging to this loan.
    const target = { id: "member-2", loanId: "loan-1", userId: "user-2", role: "OWNER" }
    ;(mockPrisma.loanMember.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockMember("OWNER")) // assertMember
      .mockResolvedValueOnce(mockMember("OWNER")) // assertOwner
      .mockResolvedValueOnce(target as any) // target lookup by id
    ;(mockPrisma.loanMember.count as jest.Mock).mockResolvedValue(1)

    const res = await removeMember(jsonReq("http://localhost/api/loans/loan-1/members/member-2", {}, "DELETE"), {
      params: Promise.resolve({ id: "loan-1", memberId: "member-2" }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Cannot remove the last owner")
    expect(mockPrisma.loanMember.delete).not.toHaveBeenCalled()
  })

  it("returns 200 when an owner removes a non-owner member", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    const target = { id: "member-2", loanId: "loan-1", userId: "user-2", role: "MEMBER" }
    ;(mockPrisma.loanMember.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockMember("OWNER")) // assertMember
      .mockResolvedValueOnce(mockMember("OWNER")) // assertOwner
      .mockResolvedValueOnce(target as any) // target lookup
    ;(mockPrisma.loanMember.delete as jest.Mock).mockResolvedValue({ id: "member-2" })

    const res = await removeMember(jsonReq("http://localhost/api/loans/loan-1/members/member-2", {}, "DELETE"), {
      params: Promise.resolve({ id: "loan-1", memberId: "member-2" }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(mockPrisma.loanMember.count).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------
describe("POST /api/loans/[id]/payments", () => {
  it("returns 201 for a member when the payer is also a member", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    // Call order: assertMember(caller), then payer-membership check.
    ;(mockPrisma.loanMember.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockMember("MEMBER")) // caller
      .mockResolvedValueOnce(mockMember("MEMBER", "user-1")) // payer
    ;(mockPrisma.loanPayment.create as jest.Mock).mockResolvedValue({
      id: "pay-1",
      loanId: "loan-1",
      paidById: "user-1",
      amount: 5000,
      paidBy: { id: "user-1", name: "Test User" },
    })

    const res = await createPayment(
      jsonReq("http://localhost/api/loans/loan-1/payments", {
        paidById: "user-1",
        date: "2026-02-01",
        description: "Booking amount",
        amount: 5000,
      }),
      { params: Promise.resolve({ id: "loan-1" }) }
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("pay-1")
  })

  it("returns 404 for a non-member", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.loanMember.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await createPayment(
      jsonReq("http://localhost/api/loans/loan-1/payments", {
        paidById: "user-1",
        date: "2026-02-01",
        description: "Booking amount",
        amount: 5000,
      }),
      { params: Promise.resolve({ id: "loan-1" }) }
    )

    expect(res.status).toBe(404)
    expect(mockPrisma.loanPayment.create).not.toHaveBeenCalled()
  })

  it("returns 400 when a required field is missing", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.loanMember.findUnique as jest.Mock).mockResolvedValue(mockMember("MEMBER"))

    const res = await createPayment(
      jsonReq("http://localhost/api/loans/loan-1/payments", {
        paidById: "user-1",
        date: "2026-02-01",
        // description missing
        amount: 5000,
      }),
      { params: Promise.resolve({ id: "loan-1" }) }
    )

    expect(res.status).toBe(400)
  })

  it("returns 400 when the payer is not a loan member", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.loanMember.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockMember("MEMBER")) // caller
      .mockResolvedValueOnce(null) // payer not a member

    const res = await createPayment(
      jsonReq("http://localhost/api/loans/loan-1/payments", {
        paidById: "stranger",
        date: "2026-02-01",
        description: "Booking amount",
        amount: 5000,
      }),
      { params: Promise.resolve({ id: "loan-1" }) }
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Payer must be a loan member")
  })
})

// ---------------------------------------------------------------------------
// EMIs (GET with year validation, POST upsert with month validation)
// ---------------------------------------------------------------------------
describe("GET /api/loans/[id]/emis", () => {
  it("returns 400 for a non-numeric year", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.loanMember.findUnique as jest.Mock).mockResolvedValue(mockMember("MEMBER"))

    const res = await getEmis(jsonReq("http://localhost/api/loans/loan-1/emis?year=abc", {}, "GET"), {
      params: Promise.resolve({ id: "loan-1" }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Invalid year")
  })

  it("returns 400 for an out-of-range year (1800)", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.loanMember.findUnique as jest.Mock).mockResolvedValue(mockMember("MEMBER"))

    const res = await getEmis(jsonReq("http://localhost/api/loans/loan-1/emis?year=1800", {}, "GET"), {
      params: Promise.resolve({ id: "loan-1" }),
    })

    expect(res.status).toBe(400)
  })

  it("returns 200 with the entries for a valid year", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.loanMember.findUnique as jest.Mock).mockResolvedValue(mockMember("MEMBER"))
    ;(mockPrisma.emiEntry.findMany as jest.Mock).mockResolvedValue([])

    const res = await getEmis(jsonReq("http://localhost/api/loans/loan-1/emis?year=2025", {}, "GET"), {
      params: Promise.resolve({ id: "loan-1" }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  it("returns 404 for a non-member", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.loanMember.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await getEmis(jsonReq("http://localhost/api/loans/loan-1/emis?year=2025", {}, "GET"), {
      params: Promise.resolve({ id: "loan-1" }),
    })

    expect(res.status).toBe(404)
  })
})

describe("POST /api/loans/[id]/emis — upsert", () => {
  it("returns 400 for an invalid month (13)", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.loanMember.findUnique as jest.Mock).mockResolvedValue(mockMember("MEMBER"))

    const res = await upsertEmi(
      jsonReq("http://localhost/api/loans/loan-1/emis", {
        userId: "user-1",
        year: 2026,
        month: 13,
        plannedShare: 4500,
      }),
      { params: Promise.resolve({ id: "loan-1" }) }
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Invalid month")
  })

  it("returns 200 and upserts a valid entry", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    // caller membership + the EMI-owner (userId) membership check.
    ;(mockPrisma.loanMember.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockMember("MEMBER")) // caller
      .mockResolvedValueOnce(mockMember("MEMBER", "user-1")) // EMI member
    ;(mockPrisma.emiEntry.upsert as jest.Mock).mockResolvedValue({
      id: "emi-1",
      loanId: "loan-1",
      userId: "user-1",
      year: 2026,
      month: 3,
      plannedShare: 4500,
      user: { id: "user-1", name: "Test User" },
    })

    const res = await upsertEmi(
      jsonReq("http://localhost/api/loans/loan-1/emis", {
        userId: "user-1",
        year: 2026,
        month: 3,
        plannedShare: 4500,
      }),
      { params: Promise.resolve({ id: "loan-1" }) }
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe("emi-1")
    expect(mockPrisma.emiEntry.upsert).toHaveBeenCalled()
  })

  it("returns 404 for a non-member", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.loanMember.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await upsertEmi(
      jsonReq("http://localhost/api/loans/loan-1/emis", {
        userId: "user-1",
        year: 2026,
        month: 3,
        plannedShare: 4500,
      }),
      { params: Promise.resolve({ id: "loan-1" }) }
    )

    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// Disbursements
// ---------------------------------------------------------------------------
describe("POST /api/loans/[id]/disbursements", () => {
  it("returns 201 for a member with a valid body", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.loanMember.findUnique as jest.Mock).mockResolvedValue(mockMember("MEMBER"))
    ;(mockPrisma.loanDisbursement.create as jest.Mock).mockResolvedValue({
      id: "disb-1",
      loanId: "loan-1",
      amount: 250000,
      date: new Date("2026-03-01"),
    })

    const res = await createDisbursement(
      jsonReq("http://localhost/api/loans/loan-1/disbursements", {
        date: "2026-03-01",
        amount: 250000,
      }),
      { params: Promise.resolve({ id: "loan-1" }) }
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("disb-1")
  })

  it("returns 404 for a non-member", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.loanMember.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await createDisbursement(
      jsonReq("http://localhost/api/loans/loan-1/disbursements", {
        date: "2026-03-01",
        amount: 250000,
      }),
      { params: Promise.resolve({ id: "loan-1" }) }
    )

    expect(res.status).toBe(404)
    expect(mockPrisma.loanDisbursement.create).not.toHaveBeenCalled()
  })
})
