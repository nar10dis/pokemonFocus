/**
 * Doit rester aligné avec CAPTURE_CONFIG.chancePerMinute côté backend :
 * les captures sont tirées par le serveur à la fin de la session, le "!" du timer
 * est le signal visuel de ces rencontres minute par minute.
 */
export const CAPTURE_CHANCE_PER_MINUTE = 0.08

/** durée d'affichage de la bulle "!" (ms) */
export const ALERT_BUBBLE_MS = 2200

const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumSignificantDigits: 2 })

/** 0.0183 → "1,8 %" : deux chiffres significatifs, lisible même pour les très rares */
export function formatDropChance(chance: number) {
  return percent.format(chance)
}
