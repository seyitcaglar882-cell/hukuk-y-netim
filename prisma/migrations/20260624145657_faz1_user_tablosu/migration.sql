-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('PATRON', 'AVUKAT', 'SEKRETER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sifreHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'AVUKAT',
    "telefon" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturulma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
