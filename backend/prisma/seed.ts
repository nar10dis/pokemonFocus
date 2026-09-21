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
  rarity?: number;
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

// les raretés évoluent : on les remet à jour sur les lignes déjà en base, groupées par valeur
const byRarity = new Map<number, number[]>();
for (const p of data) {
  if (p.rarity === undefined) continue;
  const ids = byRarity.get(p.rarity) ?? [];
  ids.push(p.id);
  byRarity.set(p.rarity, ids);
}
await prisma.$transaction(
  [...byRarity].map(([rarity, ids]) =>
    prisma.pokemon.updateMany({ where: { id: { in: ids } }, data: { rarity } }),
  ),
);
console.log(`Raretés: ${[...byRarity.values()].flat().length} Pokémon mis à jour`);

await prisma.$disconnect();
