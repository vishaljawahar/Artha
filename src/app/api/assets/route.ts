import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const AssetTypeEnum = z.enum([
  "PPF", "STOCKS", "BONDS", "US_STOCKS", "MUTUAL_FUNDS",
  "SMALLCASE", "LIC", "GOLD", "CRYPTO", "PROPERTY", "OTHER"
])

const createAssetSchema = z.object({
  recordedDate: z.string().min(1, "Recorded date is required"),
  assetType: AssetTypeEnum,
  assetName: z.string().min(1, "Asset name is required"),
  currentValue: z.number().min(0, "Current value must be non-negative"),
  investedAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const assets = await prisma.asset.findMany({
    where: { userId },
    orderBy: { recordedDate: "desc" },
  })

  return NextResponse.json(assets)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const body = await req.json()
  const parsed = createAssetSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { recordedDate, assetType, assetName, currentValue, investedAmount, notes } = parsed.data

  const asset = await prisma.asset.create({
    data: {
      userId,
      recordedDate: new Date(recordedDate),
      assetType,
      assetName,
      currentValue,
      investedAmount: investedAmount ?? null,
      notes: notes ?? null,
    },
  })

  return NextResponse.json(asset, { status: 201 })
}
