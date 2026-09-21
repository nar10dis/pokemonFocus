/**
 * ⚠️ Valeurs PROVISOIRES — à équilibrer plus tard.
 * À chaque minute de session terminée, on tente une capture.
 */
export const CAPTURE_CONFIG = {
  /** probabilité de capture à chaque minute */
  chancePerMinute: 0.08,
  /** nombre minimum de captures garanti par session terminée */
  minCaptures: 1,
  /**
   * Poids du tirage = `rarityScale - rareté` : un Pokémon à 6 % sort 95 fois plus
   * souvent qu'un mythique à 100 %. Les légendaires (98-99 %) restent ~25 fois
   * plus rares que la moyenne du Pokédex (~52 %).
   */
  rarityScale: 101,
  /** rareté utilisée quand elle n'est pas encore renseignée (Alola, Galar) */
  defaultRarity: { normal: 50, legendary: 99, mythical: 100 },
  maxLevel: 100,
} as const;

/** durées autorisées pour une session, en minutes */
export const SESSION_MIN_MINUTES = 30;
export const SESSION_MAX_MINUTES = 240;
