import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateEmiSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  amount: z.number().positive("Amount must be positive").optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
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
    const parsed = updateEmiSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const existing = await prisma.eMI.findFirst({
      where: { id, userId },
    })
    if (!existing) {
      return NextResponse.json({ error: "EMI not found" }, { status: 404 })
    }

    const { name, amount, startDate, endDate, isActive } = parsed.data

    const emi = await prisma.eMI.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(amount !== undefined && { amount }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({ emi: { ...emi, amount: Number(emi.amount) } })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("EMI update error:", error)
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
    const existing = await prisma.eMI.findFirst({
      where: { id, userId },
    })
    if (!existing) {
      return NextResponse.json({ error: "EMI not found" }, { status: 404 })
    }

    await prisma.eMI.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("EMI delete error:", error)
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
