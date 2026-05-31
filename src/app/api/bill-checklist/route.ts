import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

function parseMonthParams(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get("year")
  const monthParam = searchParams.get("month")
  const year = parseInt(yearParam ?? "", 10)
  const month = parseInt(monthParam ?? "", 10)

  if (!yearParam || isNaN(year) || year < 1900 || year > 2100) {
    return { error: "Invalid year" }
  }
  if (!monthParam || isNaN(month) || month < 1 || month > 12) {
    return { error: "Invalid month" }
  }

  return { year, month }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const parsed = parseMonthParams(req)
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  try {
    const bills = await prisma.monthlyBill.findMany({
      where: { userId, isActive: true },
      include: {
        payments: {
          where: { userId, year: parsed.year, month: parsed.month },
          take: 1,
        },
      },
      orderBy: [{ sortOrder: "asc" }, { dueDay: "asc" }, { createdAt: "asc" }],
    })

    return NextResponse.json({
      items: bills.map((bill) => {
        const payment = bill.payments[0]
        return {
          id: bill.id,
          name: bill.name,
          amount: bill.amount === null ? null : Number(bill.amount),
          dueDay: bill.dueDay,
          isPaid: payment?.isPaid ?? false,
          paidAt: payment?.paidAt ?? null,
          paymentId: payment?.id ?? null,
        }
      }),
    })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Bill checklist fetch error:", error)
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
