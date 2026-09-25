import type { UserStats } from '../stats/stats.service.js';
import { DEFAULT_TITLE, isUnlocked, TITLE_WORDS, titleLabel, type TitleWord } from './titles.js';

const NO_STATS: UserStats = {
  totalMinutes: 0,
  sessions: 0,
  captures: 0,
  species: 0,
  legendaries: 0,
  mythicals: 0,
};

const word = (id: string) => {
  const w = TITLE_WORDS.find((t) => t.id === id);
  if (!w) throw new Error(`mot ${id} absent`);
  return w;
};

describe('TITLE_WORDS', () => {
  it('ids uniques', () => {
    const ids = TITLE_WORDS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('le titre par défaut existe, est du bon type et débloqué dès le départ', () => {
    expect(word(DEFAULT_TITLE.noun).kind).toBe('noun');
    expect(word(DEFAULT_TITLE.adjective).kind).toBe('adjective');
    expect(isUnlocked(word(DEFAULT_TITLE.noun), NO_STATS)).toBe(true);
    expect(isUnlocked(word(DEFAULT_TITLE.adjective), NO_STATS)).toBe(true);
  });

  it('chaque condition porte sur une vraie statistique avec un seuil positif', () => {
    const stats = Object.keys(NO_STATS);
    for (const w of TITLE_WORDS.filter((t) => t.requires)) {
      expect(stats).toContain(w.requires!.stat);
      expect(w.requires!.min).toBeGreaterThan(0);
    }
  });
});

describe('isUnlocked', () => {
  const chercheur = word('chercheur'); // totalMinutes ≥ 60

  it('un mot sans condition est toujours débloqué', () => {
    expect(isUnlocked(word('apprenti'), NO_STATS)).toBe(true);
  });

  it('verrouillé sous le seuil', () => {
    expect(isUnlocked(chercheur, { ...NO_STATS, totalMinutes: 59 })).toBe(false);
  });

  it('débloqué pile au seuil (≥, pas >)', () => {
    expect(isUnlocked(chercheur, { ...NO_STATS, totalMinutes: 60 })).toBe(true);
  });

  it('ne regarde que la statistique demandée', () => {
    const lots: UserStats = { ...NO_STATS, sessions: 1000, captures: 1000, species: 1000 };
    expect(isUnlocked(chercheur, lots)).toBe(false);
  });

  it('les mots conditionnés sont tous verrouillés pour un nouveau compte', () => {
    const locked = TITLE_WORDS.filter((w: TitleWord) => w.requires);
    expect(locked.length).toBeGreaterThan(0);
    for (const w of locked) expect(isUnlocked(w, NO_STATS)).toBe(false);
  });
});

describe('titleLabel', () => {
  it('nom puis adjectif', () => {
    expect(titleLabel('chercheur', 'calme')).toBe('Chercheur Calme');
  });

  it('titre par défaut quand rien n’est choisi', () => {
    expect(titleLabel(null, null)).toBe('Dresseur Motivé');
  });

  it('complète seulement la partie manquante', () => {
    expect(titleLabel('elu', null)).toBe('Élu Motivé');
    expect(titleLabel(null, 'mystique')).toBe('Dresseur Mystique');
  });

  it('id inconnu (mot retiré du catalogue) : repli propre, sans espace en trop', () => {
    expect(titleLabel('inconnu', 'calme')).toBe('Dresseur Calme');
    expect(titleLabel('chercheur', 'inconnu')).toBe('Chercheur');
  });
});
