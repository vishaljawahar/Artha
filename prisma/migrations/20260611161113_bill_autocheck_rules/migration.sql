-- AlterTable
ALTER TABLE "monthly_bill_payments" ADD COLUMN     "autoChecked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "monthly_bills" ADD COLUMN     "matchCategoryId" TEXT,
ADD COLUMN     "matchKeyword" TEXT;

-- AddForeignKey
ALTER TABLE "monthly_bills" ADD CONSTRAINT "monthly_bills_matchCategoryId_fkey" FOREIGN KEY ("matchCategoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
