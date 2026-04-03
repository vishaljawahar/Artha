import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createEntrySchema = z.object({
  year: z.number().int().min(2000).max(2100),
  entryType: z.enum(["ASSET", "LIABILITY"]),
  category: z.string().min(1, "Category is required").max(100),
  particulars: z.string().min(1, "Particulars are required").max(255),
  amount: z.number().positive("Amount must be positive"),
  entryDate: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get("year")
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

  if (isNaN(year)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 })
  }

  const entries = await prisma.annualEntry.findMany({
    where: { userId, year },
    orderBy: [
      { entryType: "asc" },
      { category: "asc" },
      { createdAt: "asc" },
    ],
  })

  return NextResponse.json({ entries })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const body = await req.json()
  const parsed = createEntrySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { year, entryType, category, particulars, amount, entryDate, notes } = parsed.data

  const entry = await prisma.annualEntry.create({
    data: {
      userId,
      year,
      entryType,
      category,
      particulars,
      amount,
      entryDate: entryDate ? new Date(entryDate) : null,
      notes: notes || null,
    },
  })

  return NextResponse.json({ entry }, { status: 201 })
}
