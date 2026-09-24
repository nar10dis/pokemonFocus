/** numéro ISO du jour : 1 = lundi … 7 = dimanche */
export function isoDay(d: Date) {
  return ((d.getDay() + 6) % 7) + 1;
}

/** clé "YYYY-MM-DD" en heure locale, pour dédupliquer les jours */
export function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** lundi 00:00 (heure locale) de la semaine contenant `d` */
export function startOfWeek(d = new Date()) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}

export function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/**
 * Jours de travail d'affilée : on remonte jour par jour depuis aujourd'hui.
 * - un jour de repos (hors `workDays`) est ignoré : il ne compte pas dans la série,
 *   mais ne la casse pas non plus
 * - un jour travaillé avec au moins une session complétée compte pour 1
 * - un jour travaillé sans session la casse — sauf si c'est aujourd'hui, pas encore fini
 */
export function computeStreak(
  workedDays: ReadonlySet<string>,
  workDays: readonly number[],
  today = new Date(),
  maxLookbackDays = 3650,
): number {
  let streak = 0;
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < maxLookbackDays; i++) {
    if (workDays.includes(isoDay(cursor))) {
      if (workedDays.has(dayKey(cursor))) streak++;
      else if (i !== 0) break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
