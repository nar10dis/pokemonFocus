-- AlterTable: accessoires posés sur la photo de profil
ALTER TABLE "User" ADD COLUMN "avatarCosmetics" JSONB NOT NULL DEFAULT '[]';
