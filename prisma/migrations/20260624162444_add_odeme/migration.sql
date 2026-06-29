-- CreateEnum
CREATE TYPE "OdemeTur" AS ENUM ('VEKALET_UCRETI', 'AVANS', 'TAHSILAT', 'MASRAF');

-- CreateEnum
CREATE TYPE "OdemeDurum" AS ENUM ('BEKLIYOR', 'ODENDI', 'KISMI_ODENDI', 'IPTAL');

-- CreateTable
CREATE TABLE "odemeler" (
    "id" TEXT NOT NULL,
    "dosyaId" TEXT NOT NULL,
    "tur" "OdemeTur" NOT NULL,
    "tutar" DECIMAL(12,2) NOT NULL,
    "aciklama" TEXT,
    "tarih" TIMESTAMP(3) NOT NULL,
    "durum" "OdemeDurum" NOT NULL DEFAULT 'BEKLIYOR',
    "olusturulma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "odemeler_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "odemeler" ADD CONSTRAINT "odemeler_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
