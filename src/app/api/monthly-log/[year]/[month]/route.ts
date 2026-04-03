import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const headerSchema = z.object({
  income: z.number().min(0),
  emiTotal: z.number().min(0),
  savings: z.number().min(0),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { year: string; month: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const year = parseInt(params.year, 10)
  const month = parseInt(params.month, 10)

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid year or month" }, { status: 400 })
  }

  const [header, categories] = await Promise.all([
    prisma.monthlyHeader.findUnique({
      where: { userId_year_month: { userId, year, month } },
    }),
    prisma.category.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
    }),
  ])

  return NextResponse.json({ header, categories })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { year: string; month: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const year = parseInt(params.year, 10)
  const month = parseInt(params.month, 10)

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid year or month" }, { status: 400 })
  }

  const body = await req.json()
  const parsed = headerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { income, emiTotal, savings } = parsed.data

  const header = await prisma.monthlyHeader.upsert({
    where: { userId_year_month: { userId, year, month } },
    update: { income, emiTotal, savings },
    create: { userId, year, month, income, emiTotal, savings },
  })

  return NextResponse.json({ header })
}
