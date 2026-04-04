import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12).optional().nullable(),
  sourceType: z.enum(["BOND_INTEREST", "SB_INTEREST", "DIVIDEND", "PROFIT", "OTHER"]),
  sourceName: z.string().min(1, "Source name is required"),
  amount: z.number().positive("Amount must be positive"),
  receivedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = session.user.id
  const { id } = await params

  const existing = await prisma.passiveIncome.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (existing.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { year, month, sourceType, sourceName, amount, receivedDate, notes } = parsed.data

  const updated = await prisma.passiveIncome.update({
    where: { id },
    data: {
      year,
      month: month ?? null,
      sourceType,
      sourceName: sourceName.trim(),
      amount,
      receivedDate: receivedDate ? new Date(receivedDate) : null,
      notes: notes?.trim() || null,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = session.user.id
  const { id } = await params

  const existing = await prisma.passiveIncome.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (existing.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await prisma.passiveIncome.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
