import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { computeContributions, computeProgress } from "@/lib/loan-summary"

const LoanTypeEnum = z.enum([
  "HOME", "PERSONAL", "CAR", "EDUCATION", "GOLD", "OTHER"
])

const createLoanSchema = z.object({
  name: z.string().min(1, "Name is required"),
  lender: z.string().nullable().optional(),
  loanType: LoanTypeEnum.optional(),
  sanctionedAmount: z.number().min(0).nullable().optional(),
  interestRate: z.number().min(0).nullable().optional(),
  tenureMonths: z.number().int().min(0).nullable().optional(),
  plannedEmiAmount: z.number().min(0).nullable().optional(),
  startDate: z.string().min(1).nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const loans = await prisma.loan.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        payments: true,
        emiEntries: true,
        disbursements: true,
      },
      orderBy: { createdAt: "desc" },
    })

    const withSummary = loans.map((loan) => {
      const contributions = computeContributions(
        loan.members.map((m) => ({ userId: m.userId, name: m.user.name })),
        loan.payments.map((p) => ({ paidById: p.paidById, amount: p.amount })),
        loan.emiEntries.map((e) => ({ userId: e.userId, actualPaid: e.actualPaid })),
      )
      const progress = computeProgress(loan, loan.disbursements, contributions)
      return { ...loan, summary: { contributions, progress } }
    })

    return NextResponse.json(withSummary)
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const body = await req.json()
  const parsed = createLoanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const {
    name, lender, loanType, sanctionedAmount, interestRate,
    tenureMonths, plannedEmiAmount, startDate, notes,
  } = parsed.data

  try {
    const loan = await prisma.$transaction(async (tx) => {
      const created = await tx.loan.create({
        data: {
          name,
          lender: lender ?? null,
          loanType: loanType ?? "HOME",
          sanctionedAmount: sanctionedAmount ?? null,
          interestRate: interestRate ?? null,
          tenureMonths: tenureMonths ?? null,
          plannedEmiAmount: plannedEmiAmount ?? null,
          startDate: startDate ? new Date(startDate) : null,
          notes: notes ?? null,
          createdById: userId,
        },
      })
      await tx.loanMember.create({
        data: { loanId: created.id, userId, role: "OWNER" },
      })
      return created
    })

    return NextResponse.json(loan, { status: 201 })
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
