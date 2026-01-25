-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "creditBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "partyPaymentId" TEXT NOT NULL,
    "sellItemId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentAllocation_partyPaymentId_idx" ON "PaymentAllocation"("partyPaymentId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_sellItemId_idx" ON "PaymentAllocation"("sellItemId");

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_partyPaymentId_fkey" FOREIGN KEY ("partyPaymentId") REFERENCES "PartyPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_sellItemId_fkey" FOREIGN KEY ("sellItemId") REFERENCES "SellItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
