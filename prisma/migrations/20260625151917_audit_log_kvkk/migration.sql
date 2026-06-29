-- AlterTable
ALTER TABLE "muvekkillar" ADD COLUMN     "kvkkOnay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kvkkOnayTarihi" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT,
    "kullaniciAd" TEXT,
    "eylem" TEXT NOT NULL,
    "kaynak" TEXT NOT NULL,
    "kaynakId" TEXT,
    "detay" TEXT,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_tarih_idx" ON "audit_logs"("tarih");

-- CreateIndex
CREATE INDEX "audit_logs_kullaniciId_idx" ON "audit_logs"("kullaniciId");
