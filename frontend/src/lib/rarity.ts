import type { Pokemon, SessionCapture } from "@/lib/api"

export type RarityTier = {
  label: string
  stars: number
  /** fond de la pastille, pris dans la palette de globals.css */
  className: string
}

/** rareté utilisée quand le Pokédex ne la renseigne pas encore */
const DEFAULT_RARITY = 50

const TIERS = {
  common: { label: "Commun", stars: 1, className: "bg-(--bg-dark)" },
  uncommon: { label: "Peu commun", stars: 2, className: "bg-(--blue)" },
  rare: { label: "Rare", stars: 3, className: "bg-(--yellow-dark)" },
  veryRare: { label: "Très rare", stars: 4, className: "bg-(--red)" },
  legendary: { label: "Légendaire", stars: 5, className: "bg-(--ink)" },
  mythical: { label: "Fabuleux", stars: 5, className: "bg-(--blue-dark)" },
} satisfies Record<string, RarityTier>

/** Palier de rareté d'un Pokémon : les drapeaux légendaire / fabuleux priment sur le score. */
export function rarityTier(pokemon: Pick<Pokemon, "rarity" | "legendary" | "mythical">): RarityTier {
  if (pokemon.mythical) return TIERS.mythical
  if (pokemon.legendary) return TIERS.legendary
  const rarity = pokemon.rarity ?? DEFAULT_RARITY
  if (rarity >= 80) return TIERS.veryRare
  if (rarity >= 60) return TIERS.rare
  if (rarity >= 40) return TIERS.uncommon
  return TIERS.common
}

const integer = new Intl.NumberFormat("fr-FR")

/** 0.0183 → "1 chance sur 55" ; null pour les anciennes captures. */
export function oddsLabel(dropChance: number | null) {
  if (dropChance === null) return null
  return `1 chance sur ${integer.format(Math.round(1 / dropChance))}`
}

/** bonus en dessous duquel on n'affiche rien (1 %) */
const MIN_STREAK_BONUS = 0.01

const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 })

/**
 * « +12 % grâce à ta série de 5 jours », ou null : pas de série, ancienne capture,
 * bonus nul ou négatif (la série fait un peu baisser la chance des communs).
 */
export function streakBonusLabel(
  capture: Pick<SessionCapture, "dropChance" | "baseDropChance">,
  streakDays: number | null,
) {
  const { dropChance, baseDropChance } = capture
  if (!streakDays || dropChance === null || !baseDropChance) return null
  const bonus = dropChance / baseDropChance - 1
  if (bonus < MIN_STREAK_BONUS) return null
  return `+${percent.format(bonus)} grâce à ta série de ${streakDays} jour${streakDays > 1 ? "s" : ""}`
}
