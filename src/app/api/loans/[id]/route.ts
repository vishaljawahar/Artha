import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { assertMember, assertOwner } from "@/lib/loan-access"
import { computeContributions, computeProgress } from "@/lib/loan-summary"

const LoanTypeEnum = z.enum([
  "HOME", "PERSONAL", "CAR", "EDUCATION", "GOLD", "OTHER"
])

const updateLoanSchema = z.object({
  name: z.string().min(1).optional(),
  lender: z.string().nullable().optional(),
  loanType: LoanTypeEnum.optional(),
  sanctionedAmount: z.number().min(0).nullable().optional(),
  interestRate: z.number().min(0).nullable().optional(),
  tenureMonths: z.number().int().min(0).nullable().optional(),
  plannedEmiAmount: z.number().min(0).nullable().optional(),
  startDate: z.string().min(1).nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  const { id } = await params

  try {
    const membership = await assertMember(id, userId)
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        payments: {
          include: { paidBy: { select: { id: true, name: true } } },
          orderBy: { date: "asc" },
        },
        emiEntries: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: [{ year: "asc" }, { month: "asc" }, { userId: "asc" }],
        },
        disbursements: { orderBy: { date: "asc" } },
      },
    })

    if (!loan) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const contributions = computeContributions(
      loan.members.map((m) => ({ userId: m.userId, name: m.user.name })),
      loan.payments.map((p) => ({ paidById: p.paidById, amount: p.amount })),
      loan.emiEntries.map((e) => ({ userId: e.userId, actualPaid: e.actualPaid })),
    )
    const progress = computeProgress(loan, loan.disbursements, contributions)

    return NextResponse.json({ ...loan, currentUserId: userId, summary: { contributions, progress } })
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  const { id } = await params

  try {
    const membership = await assertMember(id, userId)
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const owner = await assertOwner(id, userId)
    if (!owner) {
      return NextResponse.json({ error: "Owner only" }, { status: 403 })
    }

    const body = await req.json()
    const parsed = updateLoanSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = parsed.data
    const updated = await prisma.loan.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.lender !== undefined && { lender: data.lender }),
        ...(data.loanType !== undefined && { loanType: data.loanType }),
        ...(data.sanctionedAmount !== undefined && { sanctionedAmount: data.sanctionedAmount }),
        ...(data.interestRate !== undefined && { interestRate: data.interestRate }),
        ...(data.tenureMonths !== undefined && { tenureMonths: data.tenureMonths }),
        ...(data.plannedEmiAmount !== undefined && { plannedEmiAmount: data.plannedEmiAmount }),
        ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  const { id } = await params

  try {
    const membership = await assertMember(id, userId)
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const owner = await assertOwner(id, userId)
    if (!owner) {
      return NextResponse.json({ error: "Owner only" }, { status: 403 })
    }

    await prisma.loan.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
