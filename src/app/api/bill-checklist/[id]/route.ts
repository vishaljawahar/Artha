import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const toggleBillSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
  isPaid: z.boolean(),
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
    const parsed = toggleBillSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const bill = await prisma.monthlyBill.findFirst({
      where: { id, userId },
    })
    if (!bill) {
      return NextResponse.json({ error: "Monthly bill not found" }, { status: 404 })
    }

    const payment = await prisma.monthlyBillPayment.upsert({
      where: {
        userId_monthlyBillId_year_month: {
          userId,
          monthlyBillId: id,
          year: parsed.data.year,
          month: parsed.data.month,
        },
      },
      create: {
        userId,
        monthlyBillId: id,
        year: parsed.data.year,
        month: parsed.data.month,
        isPaid: parsed.data.isPaid,
        paidAt: parsed.data.isPaid ? new Date() : null,
        autoChecked: false,
      },
      update: {
        isPaid: parsed.data.isPaid,
        paidAt: parsed.data.isPaid ? new Date() : null,
        autoChecked: false,
      },
    })

    return NextResponse.json({ payment })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Bill checklist update error:", error)
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
