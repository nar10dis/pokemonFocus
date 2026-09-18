import type { Pokemon } from '../generated/prisma/client.js';
import { CAPTURE_CONFIG } from './capture.config.js';

function weight(p: Pokemon) {
  if (p.mythical) return CAPTURE_CONFIG.weights.mythical;
  if (p.legendary) return CAPTURE_CONFIG.weights.legendary;
  return CAPTURE_CONFIG.weights.normal;
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
