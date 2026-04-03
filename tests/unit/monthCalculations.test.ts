function prevMonth(year: number, month: number) {
  if (month === 1) return { year: year - 1, month: 12 }
  return { year, month: month - 1 }
}

function nextMonth(year: number, month: number) {
  if (month === 12) return { year: year + 1, month: 1 }
  return { year, month: month + 1 }
}

describe("prevMonth", () => {
  it("decrements month within same year", () => {
    expect(prevMonth(2026, 5)).toEqual({ year: 2026, month: 4 })
  })
  it("wraps Jan to Dec of previous year", () => {
    expect(prevMonth(2026, 1)).toEqual({ year: 2025, month: 12 })
  })
  it("handles Dec correctly", () => {
    expect(prevMonth(2026, 12)).toEqual({ year: 2026, month: 11 })
  })
})

describe("nextMonth", () => {
  it("increments month within same year", () => {
    expect(nextMonth(2026, 4)).toEqual({ year: 2026, month: 5 })
  })
  it("wraps Dec to Jan of next year", () => {
    expect(nextMonth(2026, 12)).toEqual({ year: 2027, month: 1 })
  })
  it("handles Jan correctly", () => {
    expect(nextMonth(2026, 1)).toEqual({ year: 2026, month: 2 })
  })
})
