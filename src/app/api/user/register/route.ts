import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcrypt"
import { registerSchema } from "@/lib/validations"
import { DEFAULT_CATEGORIES } from "../../../../../prisma/seed"

export async function POST(req: NextRequest) {
  if (process.env.REGISTRATION_OPEN !== "true") {
    return NextResponse.json({ error: "Registration is closed" }, { status: 403 })
  }

  try {
    const body = await req.json()

    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, email, password } = parsed.data
    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email } })
      if (existing) return null

      const userCount = await tx.user.count()
      const role = userCount === 0 ? "ADMIN" : "MEMBER"

      const newUser = await tx.user.create({
        data: { name, email, passwordHash, role },
      })

      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((cat) => ({
          ...cat,
          userId: newUser.id,
          isDefault: true,
        })),
      })

      return newUser
    })

    if (!user) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { message: "Account created successfully" },
      { status: 201 }
    )
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Registration error:", error)
    }
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
