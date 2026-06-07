import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { assertMember } from "@/lib/loan-access"

const updateDisbursementSchema = z.object({
  date: z.string().min(1).optional(),
  amount: z.number().min(0).optional(),
  notes: z.string().nullable().optional(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; disbId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  const { id, disbId } = await params

  try {
    const membership = await assertMember(id, userId)
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const existing = await prisma.loanDisbursement.findUnique({ where: { id: disbId } })
    if (!existing || existing.loanId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const body = await req.json()
    const parsed = updateDisbursementSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = parsed.data
    const updated = await prisma.loanDisbursement.update({
      where: { id: disbId },
      data: {
        ...(data.date !== undefined && { date: new Date(data.date) }),
        ...(data.amount !== undefined && { amount: data.amount }),
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
  { params }: { params: Promise<{ id: string; disbId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  const { id, disbId } = await params

  try {
    const membership = await assertMember(id, userId)
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const existing = await prisma.loanDisbursement.findUnique({ where: { id: disbId } })
    if (!existing || existing.loanId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.loanDisbursement.delete({ where: { id: disbId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
