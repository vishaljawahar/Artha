-- CreateTable
CREATE TABLE "monthly_bills" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_bill_payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthlyBillId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_bill_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "monthly_bill_payments_userId_monthlyBillId_year_month_key" ON "monthly_bill_payments"("userId", "monthlyBillId", "year", "month");

-- AddForeignKey
ALTER TABLE "monthly_bills" ADD CONSTRAINT "monthly_bills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_bill_payments" ADD CONSTRAINT "monthly_bill_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_bill_payments" ADD CONSTRAINT "monthly_bill_payments_monthlyBillId_fkey" FOREIGN KEY ("monthlyBillId") REFERENCES "monthly_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
