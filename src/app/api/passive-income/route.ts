import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12).optional(),
  sourceType: z.enum(["BOND_INTEREST", "SB_INTEREST", "DIVIDEND", "PROFIT", "OTHER"]),
  sourceName: z.string().min(1, "Source name is required"),
  amount: z.number().positive("Amount must be positive"),
  receivedDate: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = session.user.id

  const { searchParams } = new URL(req.url)
  const year = searchParams.get("year")
  if (!year) return NextResponse.json({ error: "year is required" }, { status: 400 })

  const yearNum = parseInt(year, 10)
  if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 })
  }

  const entries = await prisma.passiveIncome.findMany({
    where: { userId, year: yearNum },
    orderBy: [
      { sourceType: "asc" },
      { receivedDate: "desc" },
    ],
  })

  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = session.user.id

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { year, month, sourceType, sourceName, amount, receivedDate, notes } = parsed.data

  const entry = await prisma.passiveIncome.create({
    data: {
      userId,
      year,
      month: month ?? null,
      sourceType,
      sourceName: sourceName.trim(),
      amount,
      receivedDate: receivedDate ? new Date(receivedDate) : null,
      notes: notes?.trim() || null,
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
