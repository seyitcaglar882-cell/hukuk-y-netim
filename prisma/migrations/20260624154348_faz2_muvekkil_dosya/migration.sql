-- CreateEnum
CREATE TYPE "MuvekkılTip" AS ENUM ('KISI', 'SIRKET');

-- CreateEnum
CREATE TYPE "DosyaTip" AS ENUM ('DANISMANLIK', 'DAVA');

-- CreateEnum
CREATE TYPE "DosyaDurum" AS ENUM ('ACIK', 'DERDEST', 'KARAR', 'TEMYIZ', 'KAPALI');

-- CreateTable
CREATE TABLE "muvekkillar" (
    "id" TEXT NOT NULL,
    "tip" "MuvekkılTip" NOT NULL DEFAULT 'KISI',
    "ad" TEXT NOT NULL,
    "tckn" TEXT,
    "vkn" TEXT,
    "telefon" TEXT,
    "email" TEXT,
    "adres" TEXT,
    "notlar" TEXT,
    "olusturulma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "muvekkillar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "dosyaNo" TEXT,
    "esasNo" TEXT,
    "tip" "DosyaTip" NOT NULL DEFAULT 'DAVA',
    "altTip" TEXT,
    "mahkeme" TEXT,
    "durum" "DosyaDurum" NOT NULL DEFAULT 'ACIK',
    "acilisTarihi" TIMESTAMP(3),
    "aciklama" TEXT,
    "muvekkılId" TEXT NOT NULL,
    "avukatId" TEXT,
    "olusturulma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "karsi_taraflar" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "vekili" TEXT,
    "iletisim" TEXT,

    CONSTRAINT "karsi_taraflar_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_muvekkılId_fkey" FOREIGN KEY ("muvekkılId") REFERENCES "muvekkillar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_avukatId_fkey" FOREIGN KEY ("avukatId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karsi_taraflar" ADD CONSTRAINT "karsi_taraflar_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
