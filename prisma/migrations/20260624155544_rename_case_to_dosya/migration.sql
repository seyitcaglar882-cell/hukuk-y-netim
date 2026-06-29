/*
  Warnings:

  - You are about to drop the column `caseId` on the `karsi_taraflar` table. All the data in the column will be lost.
  - Added the required column `dosyaId` to the `karsi_taraflar` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "karsi_taraflar" DROP CONSTRAINT "karsi_taraflar_caseId_fkey";

-- AlterTable
ALTER TABLE "karsi_taraflar" DROP COLUMN "caseId",
ADD COLUMN     "dosyaId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "karsi_taraflar" ADD CONSTRAINT "karsi_taraflar_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
