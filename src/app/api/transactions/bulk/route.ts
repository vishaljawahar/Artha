import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const MAX_BULK_LINES = 200
const MAX_LINE_LENGTH = 500

const bulkSchema = z.object({
  lines: z.string().min(1, "Lines are required").max(MAX_BULK_LINES * MAX_LINE_LENGTH, "Input too large"),
  categoryId: z.string().min(1, "Category is required"),
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const body = await req.json()
  const parsed = bulkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { lines, categoryId, year, month } = parsed.data

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

  const AMOUNT_LINE_RE = /^(\d+(?:\.\d+)?)\s+(.+)$/
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const parsedLines = lines
    .split("\n")
    .slice(0, MAX_BULK_LINES)
    .map((line) => line.slice(0, MAX_LINE_LENGTH).trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const match = AMOUNT_LINE_RE.exec(line)
      if (match) {
        return { amount: parseFloat(match[1]), description: match[2].trim() }
      }
      const amt = parseFloat(line)
      if (!isNaN(amt)) {
        return { amount: amt, description: "" }
      }
      return null
    })
    .filter((item): item is { amount: number; description: string } => item !== null)

  if (parsedLines.length === 0) {
    return NextResponse.json({ error: "No valid lines found" }, { status: 400 })
  }

  const transactions = await prisma.transaction.createMany({
    data: parsedLines.map((item) => ({
      userId,
      date: today,
      categoryId,
      description: item.description,
      amount: item.amount,
      isBulk: true,
      monthlyHeaderId: header?.id ?? null,
    })),
  })

  return NextResponse.json({ count: transactions.count }, { status: 201 })
}
