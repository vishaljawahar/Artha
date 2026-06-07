import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { assertMember } from "@/lib/loan-access"

const LoanPaymentTypeEnum = z.enum([
  "BOOKING", "DOWN_PAYMENT", "INSTALLMENT", "TDS", "AGREEMENT", "FEE", "OTHER"
])

const createPaymentSchema = z.object({
  paidById: z.string().min(1, "Payer is required"),
  date: z.string().min(1, "Date is required"),
  type: LoanPaymentTypeEnum.optional(),
  description: z.string().min(1, "Description is required"),
  amount: z.number().min(0, "Amount must be non-negative"),
  mode: z.string().nullable().optional(),
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

    const payments = await prisma.loanPayment.findMany({
      where: { loanId: id },
      include: { paidBy: { select: { id: true, name: true } } },
      orderBy: { date: "asc" },
    })

    return NextResponse.json(payments)
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

export async function POST(
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

    const body = await req.json()
    const parsed = createPaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { paidById, date, type, description, amount, mode, notes } = parsed.data

    const payer = await prisma.loanMember.findUnique({
      where: { loanId_userId: { loanId: id, userId: paidById } },
    })
    if (!payer) {
      return NextResponse.json(
        { error: "Payer must be a loan member" },
        { status: 400 }
      )
    }

    const payment = await prisma.loanPayment.create({
      data: {
        loanId: id,
        paidById,
        date: new Date(date),
        type: type ?? "OTHER",
        description,
        amount,
        mode: mode ?? null,
        notes: notes ?? null,
      },
      include: { paidBy: { select: { id: true, name: true } } },
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
