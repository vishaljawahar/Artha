import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const LOAN_NAME = "Birla Ojasvi Home Loan"
const VISHAL_EMAIL = "vishaljawahar@gmail.com"
const SOWMYA_EMAIL = "sowmyass144@gmail.com"

async function main() {
  // 1. Look up both users — both must exist before we seed anything.
  const vishal = await prisma.user.findUnique({ where: { email: VISHAL_EMAIL } })
  const sowmya = await prisma.user.findUnique({ where: { email: SOWMYA_EMAIL } })

  if (!vishal) {
    console.error(`Missing user: ${VISHAL_EMAIL} (loan OWNER). Aborting — no data created.`)
    process.exit(1)
  }
  if (!sowmya) {
    console.error(`Missing user: ${SOWMYA_EMAIL} (MEMBER). Aborting — no data created.`)
    process.exit(1)
  }

  const V = vishal.id
  const S = sowmya.id

  // 2. Idempotency guard — bail out cleanly if already seeded.
  const existing = await prisma.loan.findFirst({ where: { name: LOAN_NAME } })
  if (existing) {
    console.log("Loan already seeded — skipping.")
    return
  }

  // Payment rows (11). amount/paidBy/mode per the source ledger.
  const payments = [
    { date: new Date("2025-04-11"), type: "BOOKING" as const, description: "Booking amount", amount: 200000, paidById: V, mode: "Axis Bank Cheque" },
    { date: new Date("2025-05-05"), type: "INSTALLMENT" as const, description: "1st installment", amount: 485365, paidById: V, mode: "Axis Bank" },
    { date: new Date("2025-05-08"), type: "INSTALLMENT" as const, description: "1st installment", amount: 514635, paidById: S, mode: "Standard Chartered" },
    { date: new Date("2025-05-09"), type: "INSTALLMENT" as const, description: "1st installment", amount: 157675, paidById: S, mode: "Standard Chartered" },
    { date: new Date("2025-05-15"), type: "TDS" as const, description: "TDS - 1", amount: 13055, paidById: S, mode: null },
    { date: new Date("2025-05-22"), type: "AGREEMENT" as const, description: "Agreement", amount: 40637, paidById: S, mode: null },
    { date: new Date("2025-05-22"), type: "AGREEMENT" as const, description: "Agreement", amount: 40636, paidById: V, mode: null },
    { date: new Date("2025-07-11"), type: "FEE" as const, description: "Loan processing fee", amount: 6168, paidById: S, mode: "SBI" },
    { date: new Date("2025-07-11"), type: "FEE" as const, description: "Stamp paper", amount: 3352, paidById: V, mode: null },
    { date: new Date("2025-08-11"), type: "TDS" as const, description: "TDS - 2", amount: 13055, paidById: S, mode: null },
    { date: new Date("2025-09-02"), type: "TDS" as const, description: "TDS - 3", amount: 13055, paidById: V, mode: "UPI" },
  ]

  // EMI shares per (year, month). One EmiEntry per member; plannedShare === actualPaid.
  const emiRows = [
    { year: 2025, month: 8, vishal: 100000, sowmya: 100000 },
    { year: 2025, month: 9, vishal: 100000, sowmya: 126233 },
    { year: 2025, month: 10, vishal: 30000, sowmya: 99050 },
    { year: 2025, month: 11, vishal: 30000, sowmya: 99050 },
    { year: 2025, month: 12, vishal: 30000, sowmya: 99050 },
    { year: 2026, month: 1, vishal: 30000, sowmya: 99050 },
    { year: 2026, month: 2, vishal: 50000, sowmya: 79050 },
    { year: 2026, month: 3, vishal: 60000, sowmya: 69050 },
    { year: 2026, month: 4, vishal: 50000, sowmya: 79050 },
    { year: 2026, month: 5, vishal: 50000, sowmya: 79050 },
  ]

  const disbursements = [
    { date: new Date("2025-07-15"), amount: 1357675 },
    { date: new Date("2025-08-04"), amount: 1357675 },
    { date: new Date("2026-03-30"), amount: 1357675 },
  ]

  // 3. Create everything atomically.
  const loan = await prisma.$transaction(async (tx) => {
    const created = await tx.loan.create({
      data: {
        name: LOAN_NAME,
        lender: "SBI",
        loanType: "HOME",
        sanctionedAmount: 4073025,
        plannedEmiAmount: 129050,
        startDate: new Date("2025-04-11"),
        createdById: V,
      },
    })

    await tx.loanMember.createMany({
      data: [
        { loanId: created.id, userId: V, role: "OWNER" },
        { loanId: created.id, userId: S, role: "MEMBER" },
      ],
    })

    await tx.loanPayment.createMany({
      data: payments.map((p) => ({
        loanId: created.id,
        date: p.date,
        type: p.type,
        description: p.description,
        amount: p.amount,
        paidById: p.paidById,
        mode: p.mode,
      })),
    })

    await tx.emiEntry.createMany({
      data: emiRows.flatMap((r) => [
        { loanId: created.id, userId: V, year: r.year, month: r.month, plannedShare: r.vishal, actualPaid: r.vishal, mode: null, paidDate: null },
        { loanId: created.id, userId: S, year: r.year, month: r.month, plannedShare: r.sowmya, actualPaid: r.sowmya, mode: null, paidDate: null },
      ]),
    })

    await tx.loanDisbursement.createMany({
      data: disbursements.map((d) => ({ loanId: created.id, date: d.date, amount: d.amount })),
    })

    return created
  })

  // 4. Summary + raw contribution totals for sanity-checking.
  const emiRowCount = emiRows.length * 2

  const vishalPayments = payments.filter((p) => p.paidById === V).reduce((s, p) => s + p.amount, 0)
  const sowmyaPayments = payments.filter((p) => p.paidById === S).reduce((s, p) => s + p.amount, 0)
  const vishalEmi = emiRows.reduce((s, r) => s + r.vishal, 0)
  const sowmyaEmi = emiRows.reduce((s, r) => s + r.sowmya, 0)

  console.log("Seed complete.")
  console.log(`  Loan: ${loan.name} (id: ${loan.id})`)
  console.log(`  Members: 2 (OWNER ${VISHAL_EMAIL}, MEMBER ${SOWMYA_EMAIL})`)
  console.log(`  Payments: ${payments.length}`)
  console.log(`  EMI rows: ${emiRowCount} (${emiRows.length} months x 2 members)`)
  console.log(`  Disbursements: ${disbursements.length}`)
  console.log("  Raw contribution totals (payments + EMI shares):")
  console.log(`    Vishal: payments ${vishalPayments} + EMI ${vishalEmi} = ${vishalPayments + vishalEmi}`)
  console.log(`    Sowmya: payments ${sowmyaPayments} + EMI ${sowmyaEmi} = ${sowmyaPayments + sowmyaEmi}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
