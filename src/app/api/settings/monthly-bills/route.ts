import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createMonthlyBillSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  amount: z.number().positive("Amount must be positive").optional().nullable(),
  dueDay: z.number().int().min(1, "Due day must be between 1 and 31").max(31, "Due day must be between 1 and 31").optional().nullable(),
  isActive: z.boolean().optional(),
})

const reorderMonthlyBillsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "At least one bill is required"),
})

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const bills = await prisma.monthlyBill.findMany({
      where: { userId },
      orderBy: [{ sortOrder: "asc" }, { dueDay: "asc" }, { createdAt: "asc" }],
    })

    return NextResponse.json({
      bills: bills.map((bill) => ({ ...bill, amount: bill.amount === null ? null : Number(bill.amount) })),
    })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Monthly bills fetch error:", error)
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const body = await req.json()
    const parsed = createMonthlyBillSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const count = await prisma.monthlyBill.count({ where: { userId } })
    const bill = await prisma.monthlyBill.create({
      data: {
        userId,
        name: parsed.data.name,
        amount: parsed.data.amount ?? null,
        dueDay: parsed.data.dueDay ?? null,
        isActive: parsed.data.isActive ?? true,
        sortOrder: count,
      },
    })

    return NextResponse.json(
      { bill: { ...bill, amount: bill.amount === null ? null : Number(bill.amount) } },
      { status: 201 }
    )
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Monthly bill create error:", error)
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const body = await req.json()
    const parsed = reorderMonthlyBillsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const bills = await prisma.monthlyBill.findMany({
      where: { userId, id: { in: parsed.data.ids } },
      select: { id: true },
    })
    if (bills.length !== parsed.data.ids.length) {
      return NextResponse.json({ error: "One or more bills were not found" }, { status: 404 })
    }

    await prisma.$transaction(
      parsed.data.ids.map((id, sortOrder) =>
        prisma.monthlyBill.update({
          where: { id },
          data: { sortOrder },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Monthly bill reorder error:", error)
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
