-- AlterTable
ALTER TABLE "PartyPayment" ADD COLUMN     "deleteReason" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "PartyPayment_isDeleted_idx" ON "PartyPayment"("isDeleted");
