-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN     "attendeeIds" TEXT;

-- AlterTable
ALTER TABLE "Recipe" ALTER COLUMN "updatedAt" DROP DEFAULT;
