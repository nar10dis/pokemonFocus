-- AlterTable: jours travaillés (ISO : 1 = lundi … 7 = dimanche), par défaut la semaine sans le week-end
ALTER TABLE "User" ADD COLUMN "workDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5];
