/**
 * ⚠️ Valeurs PROVISOIRES — à équilibrer plus tard.
 * À chaque minute de session terminée, on tente une capture.
 */
export const CAPTURE_CONFIG = {
  /** probabilité de capture à chaque minute */
  chancePerMinute: 0.08,
  /** plancher absolu de captures par session terminée */
  minCaptures: 1,
  /**
   * 1 capture garantie par tranche complète de N minutes (30 min → 1, 1 h → 3,
   * 4 h → 12) : évite qu'une longue session tombe à 1 capture par malchance
   * (~4 % des sessions d'1 h avec seulement la chance par minute).
   */
  minutesPerGuaranteedCapture: 20,
  /**
   * Poids du tirage = `rarityScale - rareté` : un Pokémon à 6 % sort 95 fois plus
   * souvent qu'un mythique à 100 %. Les légendaires (98-99 %) restent ~25 fois
   * plus rares que la moyenne du Pokédex (~52 %).
   */
  rarityScale: 101,
  /** rareté utilisée quand elle n'est pas encore renseignée (Alola, Galar) */
  defaultRarity: { normal: 50, legendary: 99, mythical: 100 },
  maxLevel: 100,
  /**
   * Plus la série de jours travaillés d'affilée est longue, plus la rareté est
   * plafonnée bas pour le tirage (donc plus les rares/légendaires ont de chances de
   * sortir) — les valeurs de `rarity` en base ne changent pas, seul le tirage en tient
   * compte le temps de la série. Paliers croissants, triés par `minStreak`.
   *
   * Volontairement PAS indexé sur l'objectif hebdo : `weeklyGoalMinutes` a un minimum
   * de 30 (cf. profile.dto.ts), donc un objectif ridiculement bas serait atteint à
   * chaque session et rendrait tout bonus basé dessus gratuit. L'objectif hebdo reste
   * un repère d'assiduité sur le profil, pas un levier de tirage.
   */
  rarityCapByStreak: [
    { minStreak: 0, cap: 100 },
    { minStreak: 3, cap: 88 },
    { minStreak: 7, cap: 80 },
    { minStreak: 14, cap: 70 },
    { minStreak: 30, cap: 58 },
  ],
  /** le plafond ne descend jamais sous cette valeur */
  minRarityCap: 55,
} as const;

/** durées autorisées pour une session, en minutes */
export const SESSION_MIN_MINUTES = 30;
export const SESSION_MAX_MINUTES = 240;
