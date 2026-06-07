-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('HOME', 'PERSONAL', 'CAR', 'EDUCATION', 'GOLD', 'OTHER');

-- CreateEnum
CREATE TYPE "LoanRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "LoanPaymentType" AS ENUM ('BOOKING', 'DOWN_PAYMENT', 'INSTALLMENT', 'TDS', 'AGREEMENT', 'FEE', 'OTHER');

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lender" TEXT,
    "loanType" "LoanType" NOT NULL DEFAULT 'HOME',
    "sanctionedAmount" DECIMAL(14,2),
    "interestRate" DECIMAL(5,2),
    "tenureMonths" INTEGER,
    "plannedEmiAmount" DECIMAL(12,2),
    "startDate" DATE,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_members" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "LoanRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_payments" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "paidById" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "LoanPaymentType" NOT NULL DEFAULT 'OTHER',
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "mode" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emi_entries" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "plannedShare" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualPaid" DECIMAL(12,2),
    "mode" TEXT,
    "paidDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emi_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_disbursements" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_disbursements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loan_members_loanId_userId_key" ON "loan_members"("loanId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "emi_entries_loanId_userId_year_month_key" ON "emi_entries"("loanId", "userId", "year", "month");

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_members" ADD CONSTRAINT "loan_members_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_members" ADD CONSTRAINT "loan_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emi_entries" ADD CONSTRAINT "emi_entries_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emi_entries" ADD CONSTRAINT "emi_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_disbursements" ADD CONSTRAINT "loan_disbursements_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
