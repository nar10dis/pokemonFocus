/** Toutes les régions du jeu, y compris celles qu'on n'affiche pas encore. */
export const ALL_REGIONS = [
  "Kanto",
  "Johto",
  "Hoenn",
  "Sinnoh",
  "Unys",
  "Kalos",
  "Alola",
  "Galar",
] as const

/** Les deux dernières générations sont prêtes côté données mais masquées pour l'instant. */
export const HIDDEN_REGIONS: readonly string[] = ["Alola", "Galar"]

/** Régions proposées dans l'interface. */
export const REGIONS = ALL_REGIONS.filter((r) => !HIDDEN_REGIONS.includes(r))

export const isVisibleRegion = (region: string) => !HIDDEN_REGIONS.includes(region)
