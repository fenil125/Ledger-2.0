-- AlterTable
ALTER TABLE "BuyItem" ADD COLUMN     "transportationCharges" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SellItem" ADD COLUMN     "transportationCharges" DOUBLE PRECISION NOT NULL DEFAULT 0;
