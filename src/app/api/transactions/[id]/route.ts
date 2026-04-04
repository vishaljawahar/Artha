import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateTransactionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  categoryId: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().positive("Amount must be positive"),
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

  const existing = await prisma.transaction.findUnique({
    where: { id },
  })

  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
  }

  if (existing.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateTransactionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { date, categoryId, subcategory, description, amount } = parsed.data

  // Verify category belongs to user
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  })
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 })
  }

  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      date: new Date(date),
      categoryId,
      subcategory: subcategory || null,
      description: description ?? "",
      amount,
    },
  })

  return NextResponse.json({ transaction: { ...transaction, amount: Number(transaction.amount) } })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  const { id } = await params

  const existing = await prisma.transaction.findUnique({
    where: { id },
  })

  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
  }

  if (existing.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.transaction.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
