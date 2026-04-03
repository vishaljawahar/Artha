import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createTransactionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  categoryId: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get("year") ?? "", 10)
  const month = parseInt(searchParams.get("month") ?? "", 10)

  if (isNaN(year) || year < 1900 || year > 2100 || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid year or month" }, { status: 400 })
  }

  // Build date range for the month
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0) // last day of month

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  })

  // Get categories for joined data
  const categoryIds = Array.from(new Set(transactions.map((t) => t.categoryId)))
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds }, userId },
  })

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  const result = transactions.map((t) => ({
    ...t,
    amount: Number(t.amount),
    category: categoryMap[t.categoryId] ?? null,
  }))

  return NextResponse.json({ transactions: result })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const body = await req.json()
  const parsed = createTransactionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { date, categoryId, subcategory, description, amount, year, month } = parsed.data

  // Verify category belongs to user
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  })
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 })
  }

  // Find monthly header if exists
  const header = await prisma.monthlyHeader.findUnique({
    where: { userId_year_month: { userId, year, month } },
  })

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      date: new Date(date),
      categoryId,
      subcategory: subcategory || null,
      description,
      amount,
      monthlyHeaderId: header?.id ?? null,
    },
  })

  return NextResponse.json({ transaction: { ...transaction, amount: Number(transaction.amount) } }, { status: 201 })
}
