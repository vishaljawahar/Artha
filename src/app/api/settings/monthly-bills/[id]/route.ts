import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { safeRecomputeBillPayment } from "@/lib/bill-matching"

const updateMonthlyBillSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  amount: z.number().positive("Amount must be positive").optional().nullable(),
  dueDay: z.number().int().min(1, "Due day must be between 1 and 31").max(31, "Due day must be between 1 and 31").optional().nullable(),
  isActive: z.boolean().optional(),
  matchCategoryId: z.string().min(1).optional().nullable(),
  matchKeyword: z.string().trim().max(100, "Keyword must be 100 characters or fewer").optional().nullable(),
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

  try {
    const body = await req.json()
    const parsed = updateMonthlyBillSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const existing = await prisma.monthlyBill.findFirst({
      where: { id, userId },
    })
    if (!existing) {
      return NextResponse.json({ error: "Monthly bill not found" }, { status: 404 })
    }

    const { matchCategoryId: rawCategoryId, matchKeyword: rawKeyword, ...rest } = parsed.data

    let ruleUpdate: { matchCategoryId: string | null; matchKeyword: string | null } | undefined
    if (rawCategoryId !== undefined || rawKeyword !== undefined) {
      const matchCategoryId = rawCategoryId ?? null
      const matchKeyword = matchCategoryId ? ((rawKeyword ?? "").trim() || null) : null
      if (matchCategoryId) {
        const category = await prisma.category.findFirst({
          where: { id: matchCategoryId, userId },
        })
        if (!category) {
          return NextResponse.json({ error: "Category not found" }, { status: 404 })
        }
      }
      ruleUpdate = { matchCategoryId, matchKeyword }
    }

    const bill = await prisma.monthlyBill.update({
      where: { id },
      data: { ...rest, ...(ruleUpdate ?? {}) },
    })

    const ruleChanged =
      ruleUpdate !== undefined &&
      (ruleUpdate.matchCategoryId !== existing.matchCategoryId ||
        ruleUpdate.matchKeyword !== existing.matchKeyword)
    if (ruleChanged && bill.matchCategoryId) {
      const now = new Date()
      await safeRecomputeBillPayment(userId, bill, now.getFullYear(), now.getMonth() + 1)
    }

    return NextResponse.json({ bill: { ...bill, amount: bill.amount === null ? null : Number(bill.amount) } })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Monthly bill update error:", error)
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  const { id } = await params

  try {
    const existing = await prisma.monthlyBill.findFirst({
      where: { id, userId },
    })
    if (!existing) {
      return NextResponse.json({ error: "Monthly bill not found" }, { status: 404 })
    }

    await prisma.monthlyBill.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Monthly bill delete error:", error)
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
