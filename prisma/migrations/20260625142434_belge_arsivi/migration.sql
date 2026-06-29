-- CreateEnum
CREATE TYPE "BelgeTur" AS ENUM ('VEKALETNAME', 'DILEKCE', 'SOZLESME', 'KARAR', 'TUTANAK', 'MAKBUZ', 'DIGER');

-- CreateTable
CREATE TABLE "belgeler" (
    "id" TEXT NOT NULL,
    "dosyaId" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "dosyaYolu" TEXT NOT NULL,
    "boyut" INTEGER NOT NULL,
    "mimeTipi" TEXT NOT NULL,
    "tur" "BelgeTur" NOT NULL DEFAULT 'DIGER',
    "aciklama" TEXT,
    "yuklendi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "belgeler_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "belgeler" ADD CONSTRAINT "belgeler_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
