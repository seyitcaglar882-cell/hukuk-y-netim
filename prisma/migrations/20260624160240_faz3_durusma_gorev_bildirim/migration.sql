-- CreateEnum
CREATE TYPE "DurusmaTur" AS ENUM ('DURUSMA', 'KESIF', 'TOPLANTI', 'SON_GUN');

-- CreateEnum
CREATE TYPE "DurusmaDurum" AS ENUM ('BEKLIYOR', 'TAMAMLANDI', 'IPTAL');

-- CreateEnum
CREATE TYPE "GorevTur" AS ENUM ('GOREV', 'SURE', 'TEMYIZ', 'ITIRAZ');

-- CreateEnum
CREATE TYPE "GorevDurum" AS ENUM ('BEKLIYOR', 'TAMAMLANDI', 'GECTI');

-- CreateEnum
CREATE TYPE "BildirimTur" AS ENUM ('DURUSMA_HATIRLATMA', 'SURE_HATIRLATMA', 'TAHSILAT_HATIRLATMA', 'GENEL');

-- CreateTable
CREATE TABLE "durusmalar" (
    "id" TEXT NOT NULL,
    "dosyaId" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "tur" "DurusmaTur" NOT NULL DEFAULT 'DURUSMA',
    "yer" TEXT,
    "sonucNotu" TEXT,
    "sonrakiAdim" TEXT,
    "durum" "DurusmaDurum" NOT NULL DEFAULT 'BEKLIYOR',
    "olusturulma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "durusmalar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gorevler" (
    "id" TEXT NOT NULL,
    "dosyaId" TEXT,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "tur" "GorevTur" NOT NULL DEFAULT 'GOREV',
    "sonTarih" TIMESTAMP(3) NOT NULL,
    "atananId" TEXT,
    "durum" "GorevDurum" NOT NULL DEFAULT 'BEKLIYOR',
    "hatirlatmaTarihi" TIMESTAMP(3),
    "olusturulma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gorevler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bildirimler" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tur" "BildirimTur" NOT NULL,
    "mesaj" TEXT NOT NULL,
    "okundu" BOOLEAN NOT NULL DEFAULT false,
    "ilgiliId" TEXT,
    "ilgiliTip" TEXT,
    "olusturulma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bildirimler_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "durusmalar" ADD CONSTRAINT "durusmalar_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gorevler" ADD CONSTRAINT "gorevler_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gorevler" ADD CONSTRAINT "gorevler_atananId_fkey" FOREIGN KEY ("atananId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bildirimler" ADD CONSTRAINT "bildirimler_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
