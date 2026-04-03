import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateEntrySchema = z.object({
  entryType: z.enum(["ASSET", "LIABILITY"]).optional(),
  category: z.string().min(1, "Category is required").max(100).optional(),
  particulars: z.string().min(1, "Particulars are required").max(255).optional(),
  amount: z.number().positive("Amount must be positive").optional(),
  entryDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  const { id } = params

  const existing = await prisma.annualEntry.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 })
  }
  if (existing.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateEntrySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { entryType, category, particulars, amount, entryDate, notes } = parsed.data

  const entry = await prisma.annualEntry.update({
    where: { id },
    data: {
      ...(entryType !== undefined && { entryType }),
      ...(category !== undefined && { category }),
      ...(particulars !== undefined && { particulars }),
      ...(amount !== undefined && { amount }),
      ...(entryDate !== undefined && {
        entryDate: entryDate ? new Date(entryDate) : null,
      }),
      ...(notes !== undefined && { notes: notes || null }),
    },
  })

  return NextResponse.json({ entry })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  const { id } = params

  const existing = await prisma.annualEntry.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 })
  }
  if (existing.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.annualEntry.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
