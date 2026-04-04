import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  icon: z.string().optional(),
})

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Categories fetch error:", error)
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
    const parsed = createCategorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { name, icon } = parsed.data

    // Get max sortOrder to append at end
    const existing = await prisma.category.findMany({
      where: { userId },
      orderBy: { sortOrder: "desc" },
      take: 1,
    })
    const nextSortOrder = existing.length > 0 ? existing[0].sortOrder + 1 : 0

    const category = await prisma.category.create({
      data: {
        userId,
        name,
        icon: icon || null,
        sortOrder: nextSortOrder,
      },
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Category create error:", error)
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
