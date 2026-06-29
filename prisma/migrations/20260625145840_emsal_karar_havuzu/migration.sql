-- CreateEnum
CREATE TYPE "EmsalKaynagi" AS ENUM ('YARGITAY', 'DANISTAY', 'AYM', 'BOLGE_ADLIYE', 'DIGER');

-- CreateTable
CREATE TABLE "emsal_kararlar" (
    "id" TEXT NOT NULL,
    "mahkeme" TEXT NOT NULL,
    "kararNo" TEXT,
    "esasNo" TEXT,
    "tarih" TIMESTAMP(3),
    "kaynak" "EmsalKaynagi" NOT NULL DEFAULT 'YARGITAY',
    "konu" TEXT NOT NULL,
    "ozet" TEXT NOT NULL,
    "tamMetin" TEXT,
    "etiketler" TEXT,
    "olusturulma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emsal_kararlar_pkey" PRIMARY KEY ("id")
);
