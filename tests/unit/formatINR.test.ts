import { formatINR } from "@/components/wealth-tracker/types"

describe("formatINR", () => {
  it("formats zero", () => {
    const result = formatINR(0)
    expect(result).toMatch(/₹/)
    expect(result).toMatch(/0/)
  })

  it("formats 1000 with Indian grouping", () => {
    const result = formatINR(1000)
    expect(result).toMatch(/₹/)
    expect(result).toMatch(/1,000/)
  })

  it("formats 100000 as 1 lakh", () => {
    const result = formatINR(100000)
    expect(result).toMatch(/₹/)
    // Indian numbering: 1,00,000
    expect(result).toMatch(/1,00,000/)
  })

  it("formats 10000000 as 1 crore", () => {
    const result = formatINR(10000000)
    expect(result).toMatch(/₹/)
    // Indian numbering: 1,00,00,000
    expect(result).toMatch(/1,00,00,000/)
  })

  it("formats negative numbers", () => {
    const result = formatINR(-5000)
    expect(result).toMatch(/₹/)
    expect(result).toMatch(/5,000/)
    // Should have a minus sign or accounting notation
    expect(result).toMatch(/-|−/)
  })

  it("returns a string", () => {
    expect(typeof formatINR(42)).toBe("string")
  })
})
