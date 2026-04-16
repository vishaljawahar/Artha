import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const AssetTypeEnum = z.enum([
  "PPF", "STOCKS", "BONDS", "US_STOCKS", "FIXED_DEPOSIT", "MUTUAL_FUNDS",
  "SMALLCASE", "LIC", "GOLD", "CRYPTO", "PROPERTY", "OTHER"
])

const updateAssetSchema = z.object({
  recordedDate: z.string().min(1).optional(),
  assetType: AssetTypeEnum.optional(),
  assetName: z.string().min(1).optional(),
  currentValue: z.number().min(0).optional(),
  investedAmount: z.number().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
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

  const existing = await prisma.asset.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json()
  const parsed = updateAssetSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const data = parsed.data
  const updated = await prisma.asset.update({
    where: { id },
    data: {
      ...(data.recordedDate !== undefined && { recordedDate: new Date(data.recordedDate) }),
      ...(data.assetType !== undefined && { assetType: data.assetType }),
      ...(data.assetName !== undefined && { assetName: data.assetName }),
      ...(data.currentValue !== undefined && { currentValue: data.currentValue }),
      ...(data.investedAmount !== undefined && { investedAmount: data.investedAmount }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  })

  return NextResponse.json(updated)
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

  const existing = await prisma.asset.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.asset.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
