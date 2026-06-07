import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { assertMember, assertOwner } from "@/lib/loan-access"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  const { id, memberId } = await params

  try {
    const membership = await assertMember(id, userId)
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const owner = await assertOwner(id, userId)
    if (!owner) {
      return NextResponse.json({ error: "Owner only" }, { status: 403 })
    }

    const target = await prisma.loanMember.findUnique({ where: { id: memberId } })
    if (!target || target.loanId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    if (target.role === "OWNER") {
      const ownerCount = await prisma.loanMember.count({
        where: { loanId: id, role: "OWNER" },
      })
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last owner" },
          { status: 400 }
        )
      }
    }

    await prisma.loanMember.delete({ where: { id: memberId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
