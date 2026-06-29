-- DropForeignKey
ALTER TABLE "cases" DROP CONSTRAINT "cases_muvekkılId_fkey";

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_muvekkılId_fkey" FOREIGN KEY ("muvekkılId") REFERENCES "muvekkillar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
