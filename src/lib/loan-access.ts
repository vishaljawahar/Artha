import type { LoanMember } from "@prisma/client"
import { prisma } from "@/lib/db"

/**
 * Shared-resource access control for loans.
 *
 * Unlike every other Artha module (which isolates by `where: { userId }`), a
 * Loan is a SHARED resource read/written by multiple users. Authorization is
 * therefore based on MEMBERSHIP via the LoanMember junction table, not direct
 * ownership of the row. These helpers centralise that check so every loan API
 * route is consistent.
 */

/**
 * Look up the caller's membership of a loan.
 *
 * Queries the `LoanMember` compound unique key `loanId_userId`.
 * Returns the membership row, or null if the user is not a member.
 */
export async function getLoanMembership(
  loanId: string,
  userId: string,
): Promise<LoanMember | null> {
  return prisma.loanMember.findUnique({
    where: { loanId_userId: { loanId, userId } },
  })
}

/**
 * Assert the caller is a member of the loan.
 *
 * Returns the membership, or null if the user is not a member. Callers should
 * treat null as a 404 (the loan is invisible to non-members — we do not leak
 * the existence of loans the user cannot see).
 */
export async function assertMember(
  loanId: string,
  userId: string,
): Promise<LoanMember | null> {
  return getLoanMembership(loanId, userId)
}

/**
 * Assert the caller is an OWNER of the loan.
 *
 * Returns the membership only if its role is "OWNER", otherwise null. Callers
 * should treat null as a 404/403 for owner-only actions (e.g. editing loan
 * details, managing members). A MEMBER or non-member both yield null.
 */
export async function assertOwner(
  loanId: string,
  userId: string,
): Promise<LoanMember | null> {
  const membership = await getLoanMembership(loanId, userId)
  if (!membership || membership.role !== "OWNER") return null
  return membership
}
