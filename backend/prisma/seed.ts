import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

type PokemonSeed = {
  id: number;
  slug: string;
  image: string;
  name: string;
  types: string[];
  region: string;
  legendary: boolean;
  mythical: boolean;
};

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const data = JSON.parse(
  readFileSync(new URL('./data/pokemon.json', import.meta.url), 'utf8'),
) as PokemonSeed[];

const { count } = await prisma.pokemon.createMany({
  data,
  skipDuplicates: true,
});
console.log(`Pokédex: ${count} Pokémon ajoutés (${data.length} au total)`);
await prisma.$disconnect();
