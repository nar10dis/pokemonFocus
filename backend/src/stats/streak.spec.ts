import { addDays, computeStreak, dayKey, isoDay, startOfWeek } from './streak.js';

/** lundi 10 nov. 2025 (ISO 1) comme point de référence stable */
const MON = new Date(2025, 10, 10);
const days = (...offsets: number[]) => {
  const set = new Set<string>();
  for (const o of offsets) {
    const d = new Date(MON);
    d.setDate(d.getDate() + o);
    set.add(dayKey(d));
  }
  return set;
};

const WEEKDAYS = [1, 2, 3, 4, 5];

describe('computeStreak', () => {
  it('0 si aucune session', () => {
    expect(computeStreak(days(), WEEKDAYS, MON)).toBe(0);
  });

  it("compte les jours travaillés d'affilée jusqu'à aujourd'hui inclus", () => {
    // lun, mar, mer, jeu, ven (aujourd'hui = ven, offset 4)
    expect(computeStreak(days(0, 1, 2, 3, 4), WEEKDAYS, new Date(2025, 10, 14))).toBe(5);
  });

  it("aujourd'hui pas encore fait ne casse pas la série", () => {
    // lun→jeu faits, vendredi (aujourd'hui) pas encore
    expect(computeStreak(days(0, 1, 2, 3), WEEKDAYS, new Date(2025, 10, 14))).toBe(4);
  });

  it('un jour de repos (hors workDays) ne casse pas la série et ne compte pas', () => {
    // lundi + mardi travaillés, mercredi+jeudi = week-end perso, vendredi travaillé
    const custom = [1, 2, 5]; // lun, mar, ven
    expect(computeStreak(days(0, 1, 4), custom, new Date(2025, 10, 14))).toBe(3);
  });

  it('un jour travaillé manqué dans le passé casse la série', () => {
    // lundi fait, mardi manqué, mercredi+jeudi faits
    expect(computeStreak(days(0, 2, 3), WEEKDAYS, new Date(2025, 10, 13))).toBe(2);
  });
});

describe('computeStreak — cas limites', () => {
  it("l'heure d'aujourd'hui ne change rien (23:59 comme 00:00)", () => {
    const late = new Date(2025, 10, 14, 23, 59, 59);
    expect(computeStreak(days(0, 1, 2, 3, 4), WEEKDAYS, late)).toBe(5);
  });

  it('traverse le week-end sans casser la série', () => {
    // lun→ven de la semaine 1, puis lundi suivant (offset 7) = aujourd'hui
    expect(computeStreak(days(0, 1, 2, 3, 4, 7), WEEKDAYS, new Date(2025, 10, 17))).toBe(6);
  });

  it("aujourd'hui jour de repos : on compte la série qui précède", () => {
    // samedi 15 nov. (hors WEEKDAYS), lun→ven faits
    expect(computeStreak(days(0, 1, 2, 3, 4), WEEKDAYS, new Date(2025, 10, 15))).toBe(5);
  });

  it('une session un jour de repos ne compte pas', () => {
    // samedi (offset 5) travaillé en plus de lun→ven
    expect(computeStreak(days(0, 1, 2, 3, 4, 5), WEEKDAYS, new Date(2025, 10, 15))).toBe(5);
  });

  it("hier manqué et aujourd'hui pas fait : 0", () => {
    // lundi fait, mardi manqué, mercredi = aujourd'hui pas encore fait
    expect(computeStreak(days(0), WEEKDAYS, new Date(2025, 10, 12))).toBe(0);
  });

  it('aucun jour de travail configuré : 0', () => {
    expect(computeStreak(days(0, 1, 2), [], new Date(2025, 10, 12))).toBe(0);
  });

  it('tous les jours travaillés : la série inclut le week-end', () => {
    const all = [1, 2, 3, 4, 5, 6, 7];
    expect(computeStreak(days(0, 1, 2, 3, 4, 5, 6), all, new Date(2025, 10, 16))).toBe(7);
  });

  it('ne remonte pas au-delà de maxLookbackDays', () => {
    const all = [1, 2, 3, 4, 5, 6, 7];
    expect(computeStreak(days(0, 1, 2, 3, 4), all, new Date(2025, 10, 14), 3)).toBe(3);
  });

  it('traverse un changement de mois et le passage à l’heure d’hiver', () => {
    // 24 → 31 oct. 2025 (heure d'hiver le dimanche 26 en Europe), tous les jours travaillés
    const all = [1, 2, 3, 4, 5, 6, 7];
    const set = new Set<string>();
    for (let d = 24; d <= 31; d++) set.add(dayKey(new Date(2025, 9, d)));
    set.add(dayKey(new Date(2025, 10, 1)));
    expect(computeStreak(set, all, new Date(2025, 10, 1, 12))).toBe(9);
  });

  it("ne modifie pas la date passée en paramètre", () => {
    const today = new Date(2025, 10, 14, 15, 30);
    const copy = today.getTime();
    computeStreak(days(0, 1, 2), WEEKDAYS, today);
    expect(today.getTime()).toBe(copy);
  });
});

describe('isoDay', () => {
  it('lundi = 1 … dimanche = 7', () => {
    const week = Array.from({ length: 7 }, (_, i) => isoDay(new Date(2025, 10, 10 + i)));
    expect(week).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('dayKey', () => {
  it('formate en YYYY-MM-DD avec zéros', () => {
    expect(dayKey(new Date(2025, 0, 5))).toBe('2025-01-05');
    expect(dayKey(new Date(2025, 11, 31, 23, 59))).toBe('2025-12-31');
  });

  it('même clé pour deux heures du même jour', () => {
    expect(dayKey(new Date(2025, 10, 10, 0, 0))).toBe(dayKey(new Date(2025, 10, 10, 23, 59)));
  });
});

describe('startOfWeek', () => {
  it('renvoie le lundi 00:00 pour chaque jour de la semaine', () => {
    for (let i = 0; i < 7; i++) {
      const s = startOfWeek(new Date(2025, 10, 10 + i, 18, 45));
      expect(s).toEqual(new Date(2025, 10, 10, 0, 0, 0, 0));
    }
  });

  it('dimanche appartient à la semaine qui finit, pas à la suivante', () => {
    expect(startOfWeek(new Date(2025, 10, 16))).toEqual(new Date(2025, 10, 10));
  });

  it('traverse un changement de mois et d’année', () => {
    // jeudi 1er janv. 2026 → lundi 29 déc. 2025
    expect(startOfWeek(new Date(2026, 0, 1))).toEqual(new Date(2025, 11, 29));
  });

  it('ne modifie pas la date passée en paramètre', () => {
    const d = new Date(2025, 10, 14, 15, 30);
    const copy = d.getTime();
    startOfWeek(d);
    expect(d.getTime()).toBe(copy);
  });

  it("sans argument : utilise l'heure courante", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 10, 13, 9));
    expect(startOfWeek()).toEqual(new Date(2025, 10, 10));
    vi.useRealTimers();
  });
});

describe('addDays', () => {
  it('ajoute et retire des jours en traversant les mois', () => {
    expect(addDays(new Date(2025, 0, 31), 1)).toEqual(new Date(2025, 1, 1));
    expect(addDays(new Date(2025, 2, 1), -1)).toEqual(new Date(2025, 1, 28));
  });

  it('garde l’heure locale à travers un changement d’heure', () => {
    // 25 oct. 2025 10:00 + 7 jours → 1er nov. 10:00 (et non 09:00)
    expect(addDays(new Date(2025, 9, 25, 10), 7)).toEqual(new Date(2025, 10, 1, 10));
  });

  it('ne modifie pas la date passée en paramètre', () => {
    const d = new Date(2025, 10, 14);
    const copy = d.getTime();
    addDays(d, 3);
    expect(d.getTime()).toBe(copy);
  });
});
