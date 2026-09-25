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

/** RNG déterministe (mulberry32) : même graine → mêmes tirages à chaque exécution */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** RNG qui rejoue une suite de valeurs, pour viser un tirage précis */
function sequence(...values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

/** 99 communs + 1 rare, pour mesurer un taux de sortie */
const bigPool = (rare: Partial<Pokemon>) => [
  ...Array.from({ length: 99 }, (_, i) => mon(i + 1)),
  mon(100, rare),
];

describe('rollCaptures', () => {
  const pool = [mon(1), mon(2), mon(3)];

  it('garantit 1 capture par tranche de 20 minutes même sans chance', () => {
    expect(rollCaptures(pool, 30, () => 0.999)).toHaveLength(1);
    expect(rollCaptures(pool, 59, () => 0.999)).toHaveLength(2);
    expect(rollCaptures(pool, 60, () => 0.999)).toHaveLength(3);
    expect(rollCaptures(pool, 240, () => 0.999)).toHaveLength(12);
  });

  it('le minimum garanti ne plafonne pas les captures chanceuses', () => {
    expect(rollCaptures(pool, 60, () => 0)).toHaveLength(60);
  });

  it('garantit le minimum même pour une session de 0 minute', () => {
    expect(rollCaptures(pool, 0, () => 0)).toHaveLength(CAPTURE_CONFIG.minCaptures);
  });

  it('capture à chaque minute quand le tirage réussit', () => {
    const picks = rollCaptures(pool, 20, () => 0);
    expect(picks).toHaveLength(20);
  });

  it('un tirage égal à chancePerMinute échoue (comparaison stricte)', () => {
    const picks = rollCaptures(pool, 20, () => CAPTURE_CONFIG.chancePerMinute);
    expect(picks).toHaveLength(CAPTURE_CONFIG.minCaptures);
  });

  it('autorise les doublons', () => {
    const picks = rollCaptures([mon(1)], 10, () => 0);
    expect(new Set(picks.map((p) => p.id))).toEqual(new Set([1]));
  });

  it('choisit le Pokémon selon son poids (rarityScale - rareté)', () => {
    // poids : commun = 101 - 1 = 100, rare = 101 - 100 = 1 → total 101
    const duo = [mon(1, { rarity: 1 }), mon(2, { rarity: 100 })];
    // 0 minute → pas de tirage de capture, seulement celui du Pokémon
    expect(rollCaptures(duo, 0, sequence(0.5))[0].id).toBe(1); // 50.5 ≤ 100
    expect(rollCaptures(duo, 0, sequence(0.999))[0].id).toBe(2); // 100.9 > 100
  });

  it('le plafond de rareté alourdit les rares dans le tirage', () => {
    const duo = [mon(1, { rarity: 1 }), mon(2, { rarity: 100 })];
    // sans plafond : total 101, 0.7 → 70.7 → commun
    expect(rollCaptures(duo, 0, sequence(0.7), 100)[0].id).toBe(1);
    // plafond 50 : rare = 101 - 50 = 51, total 151, 0.7 → 105.7 → rare
    expect(rollCaptures(duo, 0, sequence(0.7), 50)[0].id).toBe(2);
  });

  it('donne la chance de tirage du Pokémon tiré, plafond de série compris', () => {
    const duo = [mon(1, { rarity: 1 }), mon(2, { rarity: 100 })];
    // sans plafond : poids 100 et 1 sur un total de 101
    expect(rollCaptures(duo, 0, sequence(0.5), 100)[0].dropChance).toBeCloseTo(100 / 101);
    expect(rollCaptures(duo, 0, sequence(0.999), 100)[0].dropChance).toBeCloseTo(1 / 101);
    // plafond 50 : le rare pèse 51 sur un total de 151
    expect(rollCaptures(duo, 0, sequence(0.7), 50)[0].dropChance).toBeCloseTo(51 / 151);
  });

  it('donne aussi la chance sans bonus de série', () => {
    const duo = [mon(1, { rarity: 1 }), mon(2, { rarity: 100 })];
    // sans série, les deux chances sont identiques
    const [plain] = rollCaptures(duo, 0, sequence(0.999), 100);
    expect(plain.baseDropChance).toBeCloseTo(plain.dropChance);
    // plafond 50 : le rare passe de 1/101 à 51/151, le commun baisse de 100/101 à 100/151
    const [rare] = rollCaptures(duo, 0, sequence(0.7), 50);
    expect(rare.baseDropChance).toBeCloseTo(1 / 101);
    const [common] = rollCaptures(duo, 0, sequence(0.1), 50);
    expect(common.baseDropChance).toBeCloseTo(100 / 101);
    expect(common.dropChance).toBeCloseTo(100 / 151);
  });

  it('rend les Pokémon à forte rareté rares', () => {
    const random = seeded(42);
    const picks = Array.from({ length: 200 }, () =>
      rollCaptures(bigPool({ rarity: 100 }), 60, random),
    ).flat();
    const rate = picks.filter((p) => p.id === 100).length / picks.length;
    expect(rate).toBeLessThan(0.005);
  });

  it('retombe sur la rareté par défaut quand elle manque', () => {
    const random = seeded(42);
    const picks = Array.from({ length: 200 }, () =>
      rollCaptures(bigPool({ rarity: null, mythical: true }), 60, random),
    ).flat();
    const rate = picks.filter((p) => p.mythical).length / picks.length;
    expect(rate).toBeLessThan(0.005);
  });

  it('rareté manquante : tirée comme la rareté par défaut (normal, légendaire, mythique)', () => {
    const { normal, legendary, mythical } = CAPTURE_CONFIG.defaultRarity;
    const cases: [Partial<Pokemon>, number][] = [
      [{}, normal],
      [{ legendary: true }, legendary],
      [{ mythical: true }, mythical],
    ];
    for (const [flags, fallback] of cases) {
      const ids = (rarity: number | null) =>
        rollCaptures([mon(1, { rarity: 1 }), mon(2, { ...flags, rarity })], 500, seeded(3)).map(
          (p) => p.id,
        );
      expect(ids(null)).toEqual(ids(fallback));
    }
  });

  it('un maxRarityCap plus bas rapproche les rares des communs', () => {
    const big = bigPool({ rarity: 100, mythical: true });
    const rateFor = (cap: number) => {
      const random = seeded(7);
      const picks = Array.from({ length: 300 }, () => rollCaptures(big, 60, random, cap)).flat();
      return picks.filter((p) => p.mythical).length / picks.length;
    };
    expect(rateFor(70)).toBeGreaterThan(rateFor(100));
  });

  // Bug latent : avec un pool vide (région sans Pokémon en base, ex. seed pas
  // joué), total = 0 et la fonction renvoie `pool[pool.length - 1]`, soit
  // `undefined`, typé `Pokemon`. sessions.service.ts plante ensuite sur `p.id`.
  // Attendu : un tableau vide (ou une erreur explicite).
  it.fails('pool vide : ne renvoie pas de Pokémon undefined', () => {
    const picks = rollCaptures([], 10, () => 0);
    expect(picks.every((p) => p !== undefined)).toBe(true);
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

  it('change de palier pile au seuil, pas avant', () => {
    for (const { minStreak, cap } of CAPTURE_CONFIG.rarityCapByStreak) {
      expect(rarityCapFor(minStreak)).toBe(Math.max(cap, CAPTURE_CONFIG.minRarityCap));
      if (minStreak > 0) expect(rarityCapFor(minStreak - 1)).toBeGreaterThan(cap);
    }
  });

  it('une série négative (donnée incohérente) garde le plafond de base', () => {
    expect(rarityCapFor(-5)).toBe(100);
  });

  it('ne descend jamais sous le plafond minimum', () => {
    expect(rarityCapFor(365)).toBeGreaterThanOrEqual(CAPTURE_CONFIG.minRarityCap);
  });

  it('paliers triés par minStreak avec des plafonds décroissants', () => {
    const tiers = CAPTURE_CONFIG.rarityCapByStreak;
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i].minStreak).toBeGreaterThan(tiers[i - 1].minStreak);
      expect(tiers[i].cap).toBeLessThan(tiers[i - 1].cap);
    }
  });
});
