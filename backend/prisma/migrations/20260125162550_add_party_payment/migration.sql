-- CreateTable
CREATE TABLE "PartyPayment" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartyPayment_partyId_idx" ON "PartyPayment"("partyId");

-- CreateIndex
CREATE INDEX "PartyPayment_paymentDate_idx" ON "PartyPayment"("paymentDate");

-- AddForeignKey
ALTER TABLE "PartyPayment" ADD CONSTRAINT "PartyPayment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;
