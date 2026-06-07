export type LoanType =
  | "HOME"
  | "PERSONAL"
  | "CAR"
  | "EDUCATION"
  | "GOLD"
  | "OTHER"

export type LoanRole = "OWNER" | "MEMBER"

export type LoanPaymentType =
  | "BOOKING"
  | "DOWN_PAYMENT"
  | "INSTALLMENT"
  | "TDS"
  | "AGREEMENT"
  | "FEE"
  | "OTHER"

export interface LoanMemberUser {
  id: string
  name: string
  email: string
}

export interface LoanMember {
  id: string
  loanId: string
  userId: string
  role: LoanRole
  joinedAt: string
  user: LoanMemberUser
}

export interface LoanPayment {
  id: string
  loanId: string
  paidById: string
  date: string
  type: LoanPaymentType
  description: string | null
  amount: string | number
  mode: string | null
  notes: string | null
  paidBy?: { id: string; name: string }
}

export interface EmiEntry {
  id: string
  loanId: string
  userId: string
  year: number
  month: number
  plannedShare: string | number
  actualPaid: string | number | null
  mode: string | null
  paidDate: string | null
  notes: string | null
  user?: { id: string; name: string }
}

export interface LoanDisbursement {
  id: string
  loanId: string
  date: string
  amount: string | number
  notes: string | null
}

export interface MemberContribution {
  userId: string
  name: string
  paidOneOff: number
  emiPaid: number
  total: number
}

export interface ContributionTotals {
  paidOneOff: number
  emiPaid: number
  total: number
}

export interface LoanProgress {
  disbursed: number
  sanctioned: number
  disbursedPct: number
  totalContributed: number
  emiPaidTotal: number
}

export interface LoanSummary {
  contributions: {
    byMember: MemberContribution[]
    totals: ContributionTotals
  }
  progress: LoanProgress
}

export interface Loan {
  id: string
  name: string
  lender: string | null
  loanType: LoanType
  sanctionedAmount: string | number | null
  interestRate: string | number | null
  tenureMonths: number | null
  plannedEmiAmount: string | number | null
  startDate: string | null
  notes: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  members: LoanMember[]
  payments: LoanPayment[]
  emiEntries: EmiEntry[]
  disbursements: LoanDisbursement[]
  summary: LoanSummary
}

export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  HOME: "Home",
  PERSONAL: "Personal",
  CAR: "Car",
  EDUCATION: "Education",
  GOLD: "Gold",
  OTHER: "Other",
}

export const LOAN_TYPE_OPTIONS: LoanType[] = [
  "HOME", "PERSONAL", "CAR", "EDUCATION", "GOLD", "OTHER",
]

export const LOAN_PAYMENT_TYPE_LABELS: Record<LoanPaymentType, string> = {
  BOOKING: "Booking",
  DOWN_PAYMENT: "Down Payment",
  INSTALLMENT: "Installment",
  TDS: "TDS",
  AGREEMENT: "Agreement",
  FEE: "Fee",
  OTHER: "Other",
}

export const LOAN_PAYMENT_TYPE_OPTIONS: LoanPaymentType[] = [
  "BOOKING", "DOWN_PAYMENT", "INSTALLMENT", "TDS", "AGREEMENT", "FEE", "OTHER",
]

export const MEMBER_COLORS: string[] = [
  "#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4",
]

export function memberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length]
}

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
