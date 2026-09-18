/**
 * ⚠️ Valeurs PROVISOIRES — à équilibrer plus tard.
 * À chaque minute de session terminée, on tente une capture.
 */
export const CAPTURE_CONFIG = {
  /** probabilité de capture à chaque minute */
  chancePerMinute: 0.08,
  /** nombre minimum de captures garanti par session terminée */
  minCaptures: 3,
  /** poids relatifs pour le tirage du Pokémon dans la région */
  weights: {
    normal: 1,
    legendary: 0.05,
    mythical: 0.02,
  },
  maxLevel: 100,
} as const;

/** durées autorisées pour une session, en minutes */
export const SESSION_MIN_MINUTES = 5;
export const SESSION_MAX_MINUTES = 240;
