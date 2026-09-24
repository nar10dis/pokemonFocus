-- AlterTable: photo de profil (Pokémon + couleur de fond)
ALTER TABLE "User" ADD COLUMN "avatarPokemonId" INTEGER,
ADD COLUMN "avatarColor" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_avatarPokemonId_fkey" FOREIGN KEY ("avatarPokemonId") REFERENCES "Pokemon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
