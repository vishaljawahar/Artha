import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { assertMember, assertOwner } from "@/lib/loan-access"

const addMemberSchema = z.object({
  email: z.string().min(1, "Email is required"),
})

export async function GET(
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
    const membership = await assertMember(id, userId)
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const members = await prisma.loanMember.findMany({
      where: { loanId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { joinedAt: "asc" },
    })

    return NextResponse.json(members)
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
    const owner = await assertOwner(id, userId)
    if (!owner) {
      return NextResponse.json({ error: "Owner only" }, { status: 403 })
    }

    const body = await req.json()
    const parsed = addMemberSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json(
        { error: "No Artha account with that email" },
        { status: 404 }
      )
    }

    const existing = await prisma.loanMember.findUnique({
      where: { loanId_userId: { loanId: id, userId: user.id } },
    })
    if (existing) {
      return NextResponse.json({ error: "Already a member" }, { status: 409 })
    }

    const member = await prisma.loanMember.create({
      data: { loanId: id, userId: user.id, role: "MEMBER" },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
