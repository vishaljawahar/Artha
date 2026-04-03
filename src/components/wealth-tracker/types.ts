export type AssetType =
  | "PPF"
  | "STOCKS"
  | "BONDS"
  | "US_STOCKS"
  | "MUTUAL_FUNDS"
  | "SMALLCASE"
  | "LIC"
  | "GOLD"
  | "CRYPTO"
  | "PROPERTY"
  | "OTHER"

export interface Asset {
  id: string
  userId: string
  recordedDate: string
  assetType: AssetType
  assetName: string
  currentValue: string | number
  investedAmount: string | number | null
  notes: string | null
  createdAt: string
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  PPF: "PPF",
  STOCKS: "Stocks",
  BONDS: "Bonds",
  US_STOCKS: "US Stocks",
  MUTUAL_FUNDS: "Mutual Funds",
  SMALLCASE: "Smallcase",
  LIC: "LIC",
  GOLD: "Gold",
  CRYPTO: "Crypto",
  PROPERTY: "Property",
  OTHER: "Other",
}

export const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  PPF: "#10B981",
  STOCKS: "#3B82F6",
  BONDS: "#F59E0B",
  US_STOCKS: "#8B5CF6",
  MUTUAL_FUNDS: "#EC4899",
  SMALLCASE: "#06B6D4",
  LIC: "#F97316",
  GOLD: "#FBBF24",
  CRYPTO: "#EF4444",
  PROPERTY: "#6B7280",
  OTHER: "#94A3B8",
}

export const ASSET_TYPE_OPTIONS: AssetType[] = [
  "PPF", "STOCKS", "BONDS", "US_STOCKS", "MUTUAL_FUNDS",
  "SMALLCASE", "LIC", "GOLD", "CRYPTO", "PROPERTY", "OTHER"
]

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/** Returns the "current" snapshot for each asset name (latest by recordedDate) */
export function computeCurrentPortfolio(assets: Asset[]): Asset[] {
  const map = new Map<string, Asset>()
  for (const asset of assets) {
    const existing = map.get(asset.assetName)
    if (!existing || new Date(asset.recordedDate) > new Date(existing.recordedDate)) {
      map.set(asset.assetName, asset)
    }
  }
  return Array.from(map.values())
}
