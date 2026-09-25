-- AlterTable
ALTER TABLE "SessionCapture" ADD COLUMN     "baseDropChance" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "WorkSession" ADD COLUMN     "streakDays" INTEGER;
