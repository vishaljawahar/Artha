import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createBudgetTargetSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  year: z.number().int().min(1900).max(2100),
  targetAmount: z.number().positive("Target amount must be positive"),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get("year")
  const year = parseInt(yearParam ?? "", 10)

  if (!yearParam || isNaN(year) || year < 1900 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 })
  }

  try {
    const targets = await prisma.budgetTarget.findMany({
      where: { userId, year },
      include: { category: true },
      orderBy: { category: { sortOrder: "asc" } },
    })

    return NextResponse.json({
      targets: targets.map((t) => ({
        ...t,
        targetAmount: Number(t.targetAmount),
      })),
    })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Budget targets fetch error:", error)
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
    const parsed = createBudgetTargetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { categoryId, year, targetAmount } = parsed.data

    // Verify category belongs to user
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId },
    })
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const target = await prisma.budgetTarget.create({
      data: {
        userId,
        categoryId,
        year,
        targetAmount,
      },
      include: { category: true },
    })

    return NextResponse.json(
      { target: { ...target, targetAmount: Number(target.targetAmount) } },
      { status: 201 }
    )
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Budget target create error:", error)
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
