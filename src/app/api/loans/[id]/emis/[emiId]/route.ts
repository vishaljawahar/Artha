import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { assertMember } from "@/lib/loan-access"

const updateEmiSchema = z.object({
  plannedShare: z.number().min(0).optional(),
  actualPaid: z.number().min(0).nullable().optional(),
  mode: z.string().nullable().optional(),
  paidDate: z.string().min(1).nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; emiId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  const { id, emiId } = await params

  try {
    const membership = await assertMember(id, userId)
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const existing = await prisma.emiEntry.findUnique({ where: { id: emiId } })
    if (!existing || existing.loanId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const body = await req.json()
    const parsed = updateEmiSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = parsed.data
    const updated = await prisma.emiEntry.update({
      where: { id: emiId },
      data: {
        ...(data.plannedShare !== undefined && { plannedShare: data.plannedShare }),
        ...(data.actualPaid !== undefined && { actualPaid: data.actualPaid }),
        ...(data.mode !== undefined && { mode: data.mode }),
        ...(data.paidDate !== undefined && { paidDate: data.paidDate ? new Date(data.paidDate) : null }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: { user: { select: { id: true, name: true } } },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; emiId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  const { id, emiId } = await params

  try {
    const membership = await assertMember(id, userId)
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const existing = await prisma.emiEntry.findUnique({ where: { id: emiId } })
    if (!existing || existing.loanId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.emiEntry.delete({ where: { id: emiId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
