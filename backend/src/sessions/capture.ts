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

/**
 * Plus un Pokémon est rare, moins il pèse dans le tirage. `maxRarityCap` plafonne la
 * rareté *effective* utilisée ici (pas la valeur affichée) : plus il est bas, plus les
 * Pokémon rares se rapprochent des communs dans le tirage.
 */
function weight(p: Pokemon, maxRarityCap: number) {
  return CAPTURE_CONFIG.rarityScale - Math.min(rarity(p), maxRarityCap);
}

/** Plafond de rareté effective selon la série de jours travaillés d'affilée. */
export function rarityCapFor(streakDays: number): number {
  let cap: number = CAPTURE_CONFIG.rarityCapByStreak[0].cap;
  for (const tier of CAPTURE_CONFIG.rarityCapByStreak)
    if (streakDays >= tier.minStreak) cap = tier.cap;
  return Math.max(cap, CAPTURE_CONFIG.minRarityCap);
}

/** Pokémon tiré, avec sa probabilité (0-1) d'être tiré à ce tirage, plafond de série compris. */
export type CapturePick = Pokemon & { dropChance: number };

/** Tire les Pokémon capturés pour une session de `minutes` dans `pool` (doublons possibles). */
export function rollCaptures(
  pool: Pokemon[],
  minutes: number,
  random = Math.random,
  maxRarityCap: number = CAPTURE_CONFIG.rarityCapByStreak[0].cap,
): CapturePick[] {
  let count = 0;
  for (let i = 0; i < minutes; i++) if (random() < CAPTURE_CONFIG.chancePerMinute) count++;
  const guaranteed = Math.floor(minutes / CAPTURE_CONFIG.minutesPerGuaranteedCapture);
  count = Math.max(count, guaranteed, CAPTURE_CONFIG.minCaptures);

  const total = pool.reduce((sum, p) => sum + weight(p, maxRarityCap), 0);
  const pick = (p: Pokemon) => ({ ...p, dropChance: weight(p, maxRarityCap) / total });
  return Array.from({ length: count }, () => {
    let r = random() * total;
    for (const p of pool) {
      r -= weight(p, maxRarityCap);
      if (r <= 0) return pick(p);
    }
    const last = pool[pool.length - 1];
    return last && pick(last);
  });
}

/**
 * Niveau obtenu par chaque capture, dans l'ordre : un doublon (déjà possédé, ou déjà
 * capturé plus tôt dans la session) monte d'un niveau. `ownedLevels` : pokemonId → niveau.
 */
export function levelUpCaptures(pokemonIds: number[], ownedLevels: Map<number, number>) {
  const levels = new Map(ownedLevels);
  return pokemonIds.map((pokemonId) => {
    const current = levels.get(pokemonId);
    const levelAfter = current === undefined ? 1 : Math.min(current + 1, CAPTURE_CONFIG.maxLevel);
    levels.set(pokemonId, levelAfter);
    return { pokemonId, isNew: current === undefined, levelAfter };
  });
}
