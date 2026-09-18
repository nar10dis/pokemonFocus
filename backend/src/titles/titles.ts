import type { UserStats } from '../stats/stats.service.js';

type Requirement = { stat: keyof UserStats; min: number } | null;

export type TitleWord = {
  id: string;
  kind: 'noun' | 'adjective';
  label: string;
  /** null = débloqué dès l'inscription */
  requires: Requirement;
};

const noun = (id: string, label: string, requires: Requirement = null): TitleWord => ({
  id,
  kind: 'noun',
  label,
  requires,
});
const adj = (id: string, label: string, requires: Requirement = null): TitleWord => ({
  id,
  kind: 'adjective',
  label,
  requires,
});

export const TITLE_WORDS: TitleWord[] = [
  // --- noms
  noun('dresseur', 'Dresseur'),
  noun('apprenti', 'Apprenti'),
  noun('explorateur', 'Explorateur'),
  noun('chercheur', 'Chercheur', { stat: 'totalMinutes', min: 60 }),
  noun('gardien', 'Gardien', { stat: 'sessions', min: 10 }),
  noun('stratege', 'Stratège', { stat: 'totalMinutes', min: 5 * 60 }),
  noun('chasseur', 'Chasseur', { stat: 'captures', min: 50 }),
  noun('collectionneur', 'Collectionneur', { stat: 'species', min: 25 }),
  noun('champion', 'Champion', { stat: 'totalMinutes', min: 25 * 60 }),
  noun('elu', 'Élu', { stat: 'legendaries', min: 1 }),
  noun('maitre', 'Maître', { stat: 'totalMinutes', min: 100 * 60 }),
  noun('professeur', 'Professeur', { stat: 'species', min: 200 }),
  // --- adjectifs
  adj('motive', 'Motivé'),
  adj('curieux', 'Curieux'),
  adj('calme', 'Calme'),
  adj('concentre', 'Concentré', { stat: 'totalMinutes', min: 2 * 60 }),
  adj('regulier', 'Régulier', { stat: 'sessions', min: 5 }),
  adj('studieux', 'Studieux', { stat: 'totalMinutes', min: 10 * 60 }),
  adj('assidu', 'Assidu', { stat: 'sessions', min: 20 }),
  adj('passionne', 'Passionné', { stat: 'captures', min: 100 }),
  adj('chanceux', 'Chanceux', { stat: 'legendaries', min: 1 }),
  adj('mystique', 'Mystique', { stat: 'mythicals', min: 1 }),
  adj('acharne', 'Acharné', { stat: 'totalMinutes', min: 50 * 60 }),
  adj('infatigable', 'Infatigable', { stat: 'totalMinutes', min: 150 * 60 }),
  adj('legendaire', 'Légendaire', { stat: 'legendaries', min: 5 }),
];

export const DEFAULT_TITLE = { noun: 'dresseur', adjective: 'motive' };

export function isUnlocked(word: TitleWord, stats: UserStats) {
  return !word.requires || stats[word.requires.stat] >= word.requires.min;
}

export function titleLabel(nounId: string | null, adjectiveId: string | null) {
  const n = TITLE_WORDS.find((w) => w.id === (nounId ?? DEFAULT_TITLE.noun));
  const a = TITLE_WORDS.find((w) => w.id === (adjectiveId ?? DEFAULT_TITLE.adjective));
  return `${n?.label ?? 'Dresseur'} ${a?.label ?? ''}`.trim();
}
