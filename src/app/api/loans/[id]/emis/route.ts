import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { assertMember } from "@/lib/loan-access"

const upsertEmiSchema = z.object({
  userId: z.string().min(1, "User is required"),
  year: z.number().int(),
  month: z.number().int(),
  plannedShare: z.number().min(0),
  actualPaid: z.number().min(0).nullable().optional(),
  mode: z.string().nullable().optional(),
  paidDate: z.string().min(1).nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function GET(
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
    const membership = await assertMember(id, userId)
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const yearParam = req.nextUrl.searchParams.get("year")
    let year: number | undefined
    if (yearParam !== null) {
      year = Number(yearParam)
      if (!Number.isInteger(year) || year < 1900 || year > 2100) {
        return NextResponse.json({ error: "Invalid year" }, { status: 400 })
      }
    }

    const emiEntries = await prisma.emiEntry.findMany({
      where: { loanId: id, ...(year !== undefined && { year }) },
      include: { user: { select: { id: true, name: true } } },
      orderBy: [{ year: "asc" }, { month: "asc" }, { userId: "asc" }],
    })

    return NextResponse.json(emiEntries)
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

export async function POST(
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
    const membership = await assertMember(id, userId)
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const body = await req.json()
    const parsed = upsertEmiSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { userId: memberId, year, month, plannedShare, actualPaid, mode, paidDate, notes } = parsed.data

    if (year < 1900 || year > 2100) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 })
    }
    if (month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 })
    }

    const member = await prisma.loanMember.findUnique({
      where: { loanId_userId: { loanId: id, userId: memberId } },
    })
    if (!member) {
      return NextResponse.json(
        { error: "User must be a loan member" },
        { status: 400 }
      )
    }

    const entry = await prisma.emiEntry.upsert({
      where: {
        loanId_userId_year_month: { loanId: id, userId: memberId, year, month },
      },
      create: {
        loanId: id,
        userId: memberId,
        year,
        month,
        plannedShare,
        actualPaid: actualPaid ?? null,
        mode: mode ?? null,
        paidDate: paidDate ? new Date(paidDate) : null,
        notes: notes ?? null,
      },
      update: {
        plannedShare,
        actualPaid: actualPaid ?? null,
        mode: mode ?? null,
        paidDate: paidDate ? new Date(paidDate) : null,
        notes: notes ?? null,
      },
      include: { user: { select: { id: true, name: true } } },
    })

    return NextResponse.json(entry)
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
