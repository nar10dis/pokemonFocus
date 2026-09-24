import { computeStreak, dayKey } from './streak.js';

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
