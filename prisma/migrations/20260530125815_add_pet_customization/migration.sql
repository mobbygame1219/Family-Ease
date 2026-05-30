-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN     "petId" TEXT;

-- AlterTable
ALTER TABLE "Pet" ADD COLUMN     "color" TEXT,
ADD COLUMN     "quickActions" TEXT;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
