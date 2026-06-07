/**
 * Pure aggregation helpers for the Loan Tracker.
 *
 * These recompute the contribution and progress totals directly from the raw
 * ledger rows (payments, EMI entries, disbursements). The ledger is the single
 * source of truth — these computed totals SUPERSEDE any manually-tallied
 * "(tbc)" figures from the old Apple Note.
 *
 * Every function here is PURE and SYNCHRONOUS, with NO database access. Money
 * values may arrive as Prisma `Decimal`, `string`, or `number`, so every amount
 * is coerced with `Number(...)` at the boundary to stay robust.
 */

/** A money value as it may arrive from Prisma / the API boundary. */
export type Money = { toString(): string } | string | number

/** One loan member, identified by user id with a display name. */
export interface ContributionMember {
  userId: string
  name: string
}

/** A one-off payment row from the loan ledger. */
export interface ContributionPayment {
  paidById: string
  amount: Money
}

/** An EMI entry row. A null `actualPaid` means nothing has been paid yet. */
export interface ContributionEmiEntry {
  userId: string
  actualPaid: Money | null
}

/** Per-member contribution breakdown. */
export interface MemberContribution {
  userId: string
  name: string
  paidOneOff: number
  emiPaid: number
  total: number
}

/** Grand totals across all members. */
export interface ContributionTotals {
  paidOneOff: number
  emiPaid: number
  total: number
}

/** Result of {@link computeContributions}. */
export interface ContributionsResult {
  byMember: MemberContribution[]
  totals: ContributionTotals
}

/** Minimal loan shape needed to compute progress. */
export interface ProgressLoan {
  sanctionedAmount: Money | null
}

/** A disbursement (lender payout) row. */
export interface ProgressDisbursement {
  amount: Money
}

/** Result of {@link computeProgress}. */
export interface ProgressResult {
  disbursed: number
  sanctioned: number
  disbursedPct: number
  totalContributed: number
  emiPaidTotal: number
}

/**
 * Coerce a Money value (Decimal | string | number | null/undefined) to a
 * finite number, defaulting to 0 for null/undefined/NaN.
 */
function toNumber(value: Money | null | undefined): number {
  if (value === null || value === undefined) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * Compute per-member and grand-total contributions from the raw ledger.
 *
 * For each member:
 *   - paidOneOff = sum of `payments.amount` where `paidById === member.userId`
 *   - emiPaid    = sum of `emiEntries.actualPaid` where `userId === member.userId`
 *   - total      = paidOneOff + emiPaid
 *
 * `byMember` preserves the input `members` order. Grand `totals` are summed
 * directly from the raw arrays (not from `byMember`), so a payment or EMI whose
 * payer is not in `members` still counts toward the totals rather than being
 * silently dropped.
 */
export function computeContributions(
  members: ContributionMember[],
  payments: ContributionPayment[],
  emiEntries: ContributionEmiEntry[],
): ContributionsResult {
  const byMember: MemberContribution[] = members.map((member) => {
    const paidOneOff = payments
      .filter((p) => p.paidById === member.userId)
      .reduce((sum, p) => sum + toNumber(p.amount), 0)
    const emiPaid = emiEntries
      .filter((e) => e.userId === member.userId)
      .reduce((sum, e) => sum + toNumber(e.actualPaid), 0)
    return {
      userId: member.userId,
      name: member.name,
      paidOneOff,
      emiPaid,
      total: paidOneOff + emiPaid,
    }
  })

  const paidOneOff = payments.reduce((sum, p) => sum + toNumber(p.amount), 0)
  const emiPaid = emiEntries.reduce((sum, e) => sum + toNumber(e.actualPaid), 0)

  return {
    byMember,
    totals: { paidOneOff, emiPaid, total: paidOneOff + emiPaid },
  }
}

/**
 * Compute disbursement/sanction progress for a loan.
 *
 *   - disbursed        = sum(disbursements.amount)
 *   - sanctioned       = Number(loan.sanctionedAmount ?? 0)
 *   - disbursedPct     = sanctioned > 0 ? (disbursed / sanctioned) * 100 : 0
 *   - totalContributed = contributions.totals.total
 *   - emiPaidTotal     = contributions.totals.emiPaid
 *
 * Guards against divide-by-zero so `disbursedPct` is always a finite number.
 */
export function computeProgress(
  loan: ProgressLoan,
  disbursements: ProgressDisbursement[],
  contributions: ContributionsResult,
): ProgressResult {
  const disbursed = disbursements.reduce((sum, d) => sum + toNumber(d.amount), 0)
  const sanctioned = toNumber(loan.sanctionedAmount)
  const disbursedPct = sanctioned > 0 ? (disbursed / sanctioned) * 100 : 0

  return {
    disbursed,
    sanctioned,
    disbursedPct,
    totalContributed: contributions.totals.total,
    emiPaidTotal: contributions.totals.emiPaid,
  }
}
