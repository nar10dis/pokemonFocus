import type { Pokemon } from '../generated/prisma/client.js';
import { CAPTURE_CONFIG } from './capture.config.js';

/** rareté 1-100 du Pokédex, avec un repli tant que la région n'est pas équilibrée */
function rarity(p: Pokemon) {
  if (p.rarity !== null) return p.rarity;
  const { mythical, legendary, normal } = CAPTURE_CONFIG.defaultRarity;
  if (p.mythical) return mythical;
  if (p.legendary) return legendary;
  return normal;
}

/** plus un Pokémon est rare, moins il pèse dans le tirage */
function weight(p: Pokemon) {
  return CAPTURE_CONFIG.rarityScale - rarity(p);
}

/** Tire les Pokémon capturés pour une session de `minutes` dans `pool` (doublons possibles). */
export function rollCaptures(pool: Pokemon[], minutes: number, random = Math.random): Pokemon[] {
  let count = 0;
  for (let i = 0; i < minutes; i++) if (random() < CAPTURE_CONFIG.chancePerMinute) count++;
  count = Math.max(count, CAPTURE_CONFIG.minCaptures);

  const total = pool.reduce((sum, p) => sum + weight(p), 0);
  return Array.from({ length: count }, () => {
    let r = random() * total;
    for (const p of pool) {
      r -= weight(p);
      if (r <= 0) return p;
    }
    return pool[pool.length - 1];
  });
}
