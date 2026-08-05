/*
  Warnings:

  - A unique constraint covering the columns `[expense_number]` on the table `expenses` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `expense_number` to the `expenses` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('RENT', 'SALARY', 'FUEL', 'UTILITIES', 'MAINTENANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpensePaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'OTHER');

-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_expense_type_id_fkey";

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "expense_number" TEXT NOT NULL,
ADD COLUMN     "payment_method" "ExpensePaymentMethod" NOT NULL DEFAULT 'CASH',
ALTER COLUMN "expense_type_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "expenses_expense_number_key" ON "expenses"("expense_number");

-- CreateIndex
CREATE INDEX "expenses_category_idx" ON "expenses"("category");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_expense_type_id_fkey" FOREIGN KEY ("expense_type_id") REFERENCES "expense_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
