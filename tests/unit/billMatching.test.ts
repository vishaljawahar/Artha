/** @jest-environment node */

jest.mock("@/lib/db", () => ({ prisma: {} }))

import { transactionMatchesRule } from "@/lib/bill-matching"

const txn = (over: Partial<{ categoryId: string; description: string | null; subcategory: string | null }> = {}) => ({
  categoryId: "cat-utilities",
  description: "BESCOM bill June",
  subcategory: null,
  ...over,
})

describe("transactionMatchesRule", () => {
  it("returns false when the bill has no rule", () => {
    expect(transactionMatchesRule({ matchCategoryId: null, matchKeyword: null }, txn())).toBe(false)
  })

  it("returns false when the category differs", () => {
    expect(transactionMatchesRule({ matchCategoryId: "cat-rent", matchKeyword: null }, txn())).toBe(false)
  })

  it("matches on category alone when keyword is empty", () => {
    expect(transactionMatchesRule({ matchCategoryId: "cat-utilities", matchKeyword: null }, txn())).toBe(true)
    expect(transactionMatchesRule({ matchCategoryId: "cat-utilities", matchKeyword: "  " }, txn())).toBe(true)
  })

  it("matches keyword case-insensitively in description", () => {
    expect(transactionMatchesRule({ matchCategoryId: "cat-utilities", matchKeyword: "bescom" }, txn())).toBe(true)
    expect(transactionMatchesRule({ matchCategoryId: "cat-utilities", matchKeyword: "BESCOM" }, txn())).toBe(true)
  })

  it("matches keyword in subcategory", () => {
    expect(
      transactionMatchesRule(
        { matchCategoryId: "cat-utilities", matchKeyword: "water" },
        txn({ description: "", subcategory: "Water board" })
      )
    ).toBe(true)
  })

  it("returns false when keyword appears nowhere", () => {
    expect(transactionMatchesRule({ matchCategoryId: "cat-utilities", matchKeyword: "airtel" }, txn())).toBe(false)
  })

  it("handles null description and subcategory", () => {
    expect(
      transactionMatchesRule(
        { matchCategoryId: "cat-utilities", matchKeyword: "bescom" },
        txn({ description: null, subcategory: null })
      )
    ).toBe(false)
  })
})
