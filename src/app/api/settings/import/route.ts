import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const importRowSchema = z.object({
  date: z.string().min(1, "Date is required"),
  categoryName: z.string().min(1, "Category name is required"),
  subcategory: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().positive("Amount must be positive"),
})

const importSchema = z.object({
  rows: z.array(importRowSchema).min(1, "At least one row is required"),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const body = await req.json()
    const parsed = importSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { rows } = parsed.data

    // Fetch all user categories for case-insensitive matching
    const userCategories = await prisma.category.findMany({
      where: { userId },
    })

    const categoryMap = new Map(
      userCategories.map((c) => [c.name.toLowerCase(), c])
    )

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1

      try {
        const dateObj = new Date(row.date)
        if (isNaN(dateObj.getTime())) {
          errors.push(`Row ${rowNum}: Invalid date "${row.date}"`)
          skipped++
          continue
        }

        const year = dateObj.getFullYear()
        const month = dateObj.getMonth() + 1

        if (year < 1900 || year > 2100) {
          errors.push(`Row ${rowNum}: Year out of range`)
          skipped++
          continue
        }

        const category = categoryMap.get(row.categoryName.toLowerCase())
        if (!category) {
          errors.push(`Row ${rowNum}: Category "${row.categoryName}" not found`)
          skipped++
          continue
        }

        // Upsert monthly header
        const header = await prisma.monthlyHeader.upsert({
          where: { userId_year_month: { userId, year, month } },
          update: {},
          create: {
            userId,
            year,
            month,
            income: 0,
            emiTotal: 0,
            savings: 0,
          },
        })

        await prisma.transaction.create({
          data: {
            userId,
            date: dateObj,
            categoryId: category.id,
            subcategory: row.subcategory || null,
            description: row.description ?? "",
            amount: row.amount,
            monthlyHeaderId: header.id,
          },
        })

        imported++
      } catch {
        errors.push(`Row ${rowNum}: Failed to import`)
        skipped++
      }
    }

    return NextResponse.json({ imported, skipped, errors }, { status: 201 })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Import error:", error)
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
