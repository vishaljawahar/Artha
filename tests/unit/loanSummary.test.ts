import { computeContributions, computeProgress } from "@/lib/loan-summary"

describe("computeContributions", () => {
  it("returns all zeros for empty arrays", () => {
    const result = computeContributions([], [], [])
    expect(result.byMember).toEqual([])
    expect(result.totals).toEqual({ paidOneOff: 0, emiPaid: 0, total: 0 })
  })

  it("computes totals for a single member with one-off payments and EMIs", () => {
    const members = [{ userId: "u1", name: "Vishal" }]
    const payments = [
      { paidById: "u1", amount: 200000 },
      { paidById: "u1", amount: 50000 },
    ]
    const emiEntries = [{ userId: "u1", actualPaid: 30000 }]

    const result = computeContributions(members, payments, emiEntries)

    expect(result.byMember).toHaveLength(1)
    expect(result.byMember[0]).toEqual({
      userId: "u1",
      name: "Vishal",
      paidOneOff: 250000,
      emiPaid: 30000,
      total: 280000,
    })
    expect(result.totals).toEqual({ paidOneOff: 250000, emiPaid: 30000, total: 280000 })
  })

  it("splits contributions across two members with mixed payments and EMIs", () => {
    const members = [
      { userId: "u1", name: "Vishal" },
      { userId: "u2", name: "Partner" },
    ]
    const payments = [
      { paidById: "u1", amount: 200000 },
      { paidById: "u2", amount: 100000 },
      { paidById: "u1", amount: 25000 },
    ]
    const emiEntries = [
      { userId: "u1", actualPaid: 15000 },
      { userId: "u2", actualPaid: 15000 },
      { userId: "u2", actualPaid: 15000 },
    ]

    const result = computeContributions(members, payments, emiEntries)

    expect(result.byMember[0]).toEqual({
      userId: "u1",
      name: "Vishal",
      paidOneOff: 225000,
      emiPaid: 15000,
      total: 240000,
    })
    expect(result.byMember[1]).toEqual({
      userId: "u2",
      name: "Partner",
      paidOneOff: 100000,
      emiPaid: 30000,
      total: 130000,
    })
    expect(result.totals).toEqual({ paidOneOff: 325000, emiPaid: 45000, total: 370000 })
  })

  it("preserves the input members order in byMember", () => {
    const members = [
      { userId: "u2", name: "Partner" },
      { userId: "u1", name: "Vishal" },
    ]
    const result = computeContributions(members, [], [])
    expect(result.byMember.map((m) => m.userId)).toEqual(["u2", "u1"])
  })

  it("treats null actualPaid as 0", () => {
    const members = [{ userId: "u1", name: "Vishal" }]
    const emiEntries = [
      { userId: "u1", actualPaid: null },
      { userId: "u1", actualPaid: 20000 },
    ]

    const result = computeContributions(members, [], emiEntries)

    expect(result.byMember[0].emiPaid).toBe(20000)
    expect(result.totals.emiPaid).toBe(20000)
  })

  it("coerces string and number amounts (Decimal at boundary)", () => {
    const members = [{ userId: "u1", name: "Vishal" }]
    const payments = [
      { paidById: "u1", amount: "200000" },
      { paidById: "u1", amount: 50000 },
    ]
    const emiEntries = [{ userId: "u1", actualPaid: "30000" }]

    const result = computeContributions(members, payments, emiEntries)

    expect(result.byMember[0].paidOneOff).toBe(250000)
    expect(result.byMember[0].emiPaid).toBe(30000)
    expect(result.totals.total).toBe(280000)
  })

  it("counts orphaned payer rows in grand totals even if not in members", () => {
    const members = [{ userId: "u1", name: "Vishal" }]
    const payments = [
      { paidById: "u1", amount: 100000 },
      { paidById: "ghost", amount: 75000 },
    ]
    const emiEntries = [{ userId: "ghost", actualPaid: 5000 }]

    const result = computeContributions(members, payments, emiEntries)

    // byMember only reflects known members
    expect(result.byMember[0].paidOneOff).toBe(100000)
    expect(result.byMember[0].emiPaid).toBe(0)
    // grand totals include the orphaned rows
    expect(result.totals.paidOneOff).toBe(175000)
    expect(result.totals.emiPaid).toBe(5000)
    expect(result.totals.total).toBe(180000)
  })
})

describe("computeProgress", () => {
  it("computes disbursed percentage when sanctioned > 0", () => {
    const loan = { sanctionedAmount: 4073025 }
    const disbursements = [{ amount: 1357675 }, { amount: 1357675 }]
    const contributions = computeContributions(
      [{ userId: "u1", name: "Vishal" }],
      [{ paidById: "u1", amount: 200000 }],
      [{ userId: "u1", actualPaid: 30000 }],
    )

    const result = computeProgress(loan, disbursements, contributions)

    expect(result.disbursed).toBe(2715350)
    expect(result.sanctioned).toBe(4073025)
    expect(result.disbursedPct).toBeCloseTo((2715350 / 4073025) * 100, 6)
    expect(result.totalContributed).toBe(230000)
    expect(result.emiPaidTotal).toBe(30000)
  })

  it("returns disbursedPct 0 when sanctioned is 0 (no divide by zero)", () => {
    const loan = { sanctionedAmount: 0 }
    const disbursements = [{ amount: 100000 }]
    const contributions = computeContributions([], [], [])

    const result = computeProgress(loan, disbursements, contributions)

    expect(result.sanctioned).toBe(0)
    expect(result.disbursed).toBe(100000)
    expect(result.disbursedPct).toBe(0)
    expect(Number.isFinite(result.disbursedPct)).toBe(true)
  })

  it("returns disbursedPct 0 when sanctioned is null", () => {
    const loan = { sanctionedAmount: null }
    const disbursements = [{ amount: 100000 }]
    const contributions = computeContributions([], [], [])

    const result = computeProgress(loan, disbursements, contributions)

    expect(result.sanctioned).toBe(0)
    expect(result.disbursedPct).toBe(0)
    expect(Number.isNaN(result.disbursedPct)).toBe(false)
  })

  it("coerces string disbursement amounts", () => {
    const loan = { sanctionedAmount: "1000000" }
    const disbursements = [{ amount: "500000" }, { amount: 250000 }]
    const contributions = computeContributions([], [], [])

    const result = computeProgress(loan, disbursements, contributions)

    expect(result.disbursed).toBe(750000)
    expect(result.sanctioned).toBe(1000000)
    expect(result.disbursedPct).toBeCloseTo(75, 6)
  })

  it("returns 0 disbursed for empty disbursements", () => {
    const loan = { sanctionedAmount: 4073025 }
    const contributions = computeContributions([], [], [])

    const result = computeProgress(loan, [], contributions)

    expect(result.disbursed).toBe(0)
    expect(result.disbursedPct).toBe(0)
  })
})
