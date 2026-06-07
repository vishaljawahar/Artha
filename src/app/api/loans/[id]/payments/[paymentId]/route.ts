import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { assertMember } from "@/lib/loan-access"

const LoanPaymentTypeEnum = z.enum([
  "BOOKING", "DOWN_PAYMENT", "INSTALLMENT", "TDS", "AGREEMENT", "FEE", "OTHER"
])

const updatePaymentSchema = z.object({
  paidById: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  type: LoanPaymentTypeEnum.optional(),
  description: z.string().min(1).optional(),
  amount: z.number().min(0).optional(),
  mode: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  const { id, paymentId } = await params

  try {
    const membership = await assertMember(id, userId)
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const existing = await prisma.loanPayment.findUnique({ where: { id: paymentId } })
    if (!existing || existing.loanId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const body = await req.json()
    const parsed = updatePaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = parsed.data

    if (data.paidById !== undefined) {
      const payer = await prisma.loanMember.findUnique({
        where: { loanId_userId: { loanId: id, userId: data.paidById } },
      })
      if (!payer) {
        return NextResponse.json(
          { error: "Payer must be a loan member" },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.loanPayment.update({
      where: { id: paymentId },
      data: {
        ...(data.paidById !== undefined && { paidById: data.paidById }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.mode !== undefined && { mode: data.mode }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: { paidBy: { select: { id: true, name: true } } },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  const { id, paymentId } = await params

  try {
    const membership = await assertMember(id, userId)
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const existing = await prisma.loanPayment.findUnique({ where: { id: paymentId } })
    if (!existing || existing.loanId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.loanPayment.delete({ where: { id: paymentId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
