import { computeCurrentPortfolio, Asset } from "@/components/wealth-tracker/types"

function makeAsset(overrides: Partial<Asset> & { assetName: string; recordedDate: string }): Asset {
  return {
    id: `id-${Math.random()}`,
    userId: "user-1",
    assetType: "STOCKS",
    currentValue: 10000,
    investedAmount: null,
    notes: null,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("computeCurrentPortfolio", () => {
  it("returns empty array for empty input", () => {
    expect(computeCurrentPortfolio([])).toEqual([])
  })

  it("returns single asset when only one exists", () => {
    const asset = makeAsset({ assetName: "Zerodha", recordedDate: "2026-01-01" })
    const result = computeCurrentPortfolio([asset])
    expect(result).toHaveLength(1)
    expect(result[0].assetName).toBe("Zerodha")
  })

  it("returns the record with later recordedDate when same assetName has two records", () => {
    const older = makeAsset({ id: "old", assetName: "PPF", recordedDate: "2025-01-01", currentValue: 50000 })
    const newer = makeAsset({ id: "new", assetName: "PPF", recordedDate: "2026-01-01", currentValue: 75000 })

    const result = computeCurrentPortfolio([older, newer])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("new")
    expect(result[0].currentValue).toBe(75000)
  })

  it("also selects later record when older is listed first in input", () => {
    const older = makeAsset({ id: "old", assetName: "GOLD", recordedDate: "2024-06-01", currentValue: 100000 })
    const newer = makeAsset({ id: "new", assetName: "GOLD", recordedDate: "2025-06-01", currentValue: 150000 })

    const result = computeCurrentPortfolio([older, newer])
    expect(result[0].id).toBe("new")
  })

  it("handles multiple different assetNames independently", () => {
    const stocks = makeAsset({ id: "s1", assetName: "Zerodha Stocks", recordedDate: "2026-01-01" })
    const stocksOld = makeAsset({ id: "s0", assetName: "Zerodha Stocks", recordedDate: "2025-01-01" })
    const ppf = makeAsset({ id: "p1", assetName: "PPF Account", recordedDate: "2026-01-01" })
    const gold = makeAsset({ id: "g1", assetName: "SGB Gold", recordedDate: "2026-03-01" })

    const result = computeCurrentPortfolio([stocks, stocksOld, ppf, gold])
    expect(result).toHaveLength(3)

    const names = result.map((a) => a.assetName).sort()
    expect(names).toEqual(["PPF Account", "SGB Gold", "Zerodha Stocks"])

    const stocksResult = result.find((a) => a.assetName === "Zerodha Stocks")
    expect(stocksResult?.id).toBe("s1")
  })
})
