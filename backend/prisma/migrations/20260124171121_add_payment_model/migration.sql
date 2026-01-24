-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "sellItemId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_sellItemId_idx" ON "Payment"("sellItemId");

-- CreateIndex
CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");

-- CreateIndex
CREATE INDEX "Payment_createdBy_idx" ON "Payment"("createdBy");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_sellItemId_fkey" FOREIGN KEY ("sellItemId") REFERENCES "SellItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
