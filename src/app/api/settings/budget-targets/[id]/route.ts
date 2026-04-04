import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateBudgetTargetSchema = z.object({
  targetAmount: z.number().positive("Target amount must be positive"),
})

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
    const body = await req.json()
    const parsed = updateBudgetTargetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const existing = await prisma.budgetTarget.findFirst({
      where: { id, userId },
    })
    if (!existing) {
      return NextResponse.json({ error: "Budget target not found" }, { status: 404 })
    }

    const target = await prisma.budgetTarget.update({
      where: { id },
      data: { targetAmount: parsed.data.targetAmount },
      include: { category: true },
    })

    return NextResponse.json({ target: { ...target, targetAmount: Number(target.targetAmount) } })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Budget target update error:", error)
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
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
    const existing = await prisma.budgetTarget.findFirst({
      where: { id, userId },
    })
    if (!existing) {
      return NextResponse.json({ error: "Budget target not found" }, { status: 404 })
    }

    await prisma.budgetTarget.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Budget target delete error:", error)
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
