import type { Pokemon } from '../generated/prisma/client.js';
import { CAPTURE_CONFIG } from './capture.config.js';
import { rarityCapFor, rollCaptures } from './capture.js';

const mon = (id: number, extra: Partial<Pokemon> = {}): Pokemon => ({
  id,
  slug: `p${id}`,
  image: `p${id}`,
  name: `P${id}`,
  types: [],
  region: 'Kanto',
  legendary: false,
  mythical: false,
  rarity: 50,
  ...extra,
});

describe('rollCaptures', () => {
  const pool = [mon(1), mon(2), mon(3)];

  it('garantit le minimum de captures même sans chance', () => {
    const picks = rollCaptures(pool, 60, () => 0.999);
    expect(picks).toHaveLength(CAPTURE_CONFIG.minCaptures);
  });

  it('capture à chaque minute quand le tirage réussit', () => {
    const picks = rollCaptures(pool, 20, () => 0);
    expect(picks).toHaveLength(20);
  });

  it('autorise les doublons', () => {
    const picks = rollCaptures([mon(1)], 10, () => 0);
    expect(new Set(picks.map((p) => p.id))).toEqual(new Set([1]));
  });

  it('rend les Pokémon à forte rareté rares', () => {
    const big = [...Array.from({ length: 99 }, (_, i) => mon(i + 1)), mon(100, { rarity: 100 })];
    const picks = Array.from({ length: 200 }, () => rollCaptures(big, 60)).flat();
    const rate = picks.filter((p) => p.id === 100).length / picks.length;
    expect(rate).toBeLessThan(0.005);
  });

  it('retombe sur la rareté par défaut quand elle manque', () => {
    const big = [
      ...Array.from({ length: 99 }, (_, i) => mon(i + 1)),
      mon(100, { rarity: null, mythical: true }),
    ];
    const picks = Array.from({ length: 200 }, () => rollCaptures(big, 60)).flat();
    const rate = picks.filter((p) => p.mythical).length / picks.length;
    expect(rate).toBeLessThan(0.005);
  });

  it('un maxRarityCap plus bas rapproche les rares des communs', () => {
    const big = [
      ...Array.from({ length: 99 }, (_, i) => mon(i + 1)),
      mon(100, { rarity: 100, mythical: true }),
    ];
    const withoutCap = Array.from({ length: 300 }, () => rollCaptures(big, 60, Math.random, 100)).flat();
    const withCap = Array.from({ length: 300 }, () => rollCaptures(big, 60, Math.random, 70)).flat();
    const rateWithoutCap = withoutCap.filter((p) => p.mythical).length / withoutCap.length;
    const rateWithCap = withCap.filter((p) => p.mythical).length / withCap.length;
    expect(rateWithCap).toBeGreaterThan(rateWithoutCap);
  });
});

describe('rarityCapFor', () => {
  it('reste à 100 sans série', () => {
    expect(rarityCapFor(0)).toBe(100);
    expect(rarityCapFor(2)).toBe(100);
  });

  it('descend par paliers avec la série', () => {
    expect(rarityCapFor(3)).toBe(88);
    expect(rarityCapFor(7)).toBe(80);
    expect(rarityCapFor(14)).toBe(70);
    expect(rarityCapFor(30)).toBe(58);
    expect(rarityCapFor(365)).toBe(58);
  });

  it('ne descend jamais sous le plafond minimum', () => {
    expect(rarityCapFor(365)).toBeGreaterThanOrEqual(55);
  });
});
