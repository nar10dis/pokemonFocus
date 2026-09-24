/**
 * Script ponctuel : simule 4 dresseurs fictifs avec des habitudes de jeu différentes
 * (occasionnel / série sans objectif / objectif sans série / les deux) en réutilisant
 * la vraie logique de tirage (capture.ts) et de série (streak.ts), pour illustrer le
 * plafond de rareté dynamique. Sortie : JSON sur stdout, consommé par un script externe
 * qui l'embarque dans frontend/public/pokedex-fr.html. Pas destiné à tourner en prod.
 */
import { readFileSync } from 'node:fs';
import { rarityCapFor, rollCaptures } from '../src/sessions/capture.js';
import { CAPTURE_CONFIG } from '../src/sessions/capture.config.js';
import { addDays, computeStreak, dayKey, isoDay, startOfWeek } from '../src/stats/streak.js';

type PokemonSeed = {
  id: number;
  slug: string;
  image: string;
  name: string;
  types: string[];
  region: string;
  legendary: boolean;
  mythical: boolean;
  rarity?: number;
};

const all: PokemonSeed[] = JSON.parse(
  readFileSync(new URL('../prisma/data/pokemon.json', import.meta.url), 'utf8'),
);
// même région pour les 4 : comparaison à pool identique
const pool = all.filter((p) => p.region === 'Kanto').map((p) => ({ ...p, rarity: p.rarity ?? null }));

const WORK_DAYS = [1, 2, 3, 4, 5];
const WEEKLY_GOAL = 600;
const DAYS_BACK = 56; // 8 semaines de simulation

function mulberry32(seed: number) {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Persona = {
  key: string;
  name: string;
  blurb: string;
  daily: (rand: () => number) => { play: boolean; minutes: number };
};

const personas: Persona[] = [
  {
    key: 'occasionnel',
    name: 'Camille',
    blurb: "Joueuse occasionnelle : ni série ni objectif fixe, elle vient quand elle a le temps.",
    daily: (r) => ({ play: r() < 0.25, minutes: 30 + Math.floor(r() * 60) }),
  },
  {
    key: 'streak',
    name: 'Hugo',
    blurb: "Fait sa série sans son objectif : une petite session chaque jour ouvré, jamais les 10 h/semaine.",
    daily: (r) => ({ play: true, minutes: 25 + Math.floor(r() * 16) }),
  },
  {
    key: 'goal',
    name: 'Nora',
    blurb: "Fait son objectif sans sa série : peu de sessions mais très longues, pas forcément d'affilée.",
    daily: (r) => ({ play: r() < 0.6, minutes: 200 + Math.floor(r() * 61) }),
  },
  {
    key: 'both',
    name: 'Sacha',
    blurb: "Les deux à fond : grosse session tous les jours ouvrés.",
    daily: (r) => ({ play: true, minutes: 100 + Math.floor(r() * 51) }),
  },
];

type Capture = { pokemonId: number; level: number; count: number; firstAt: string; lastAt: string };

function simulate(persona: Persona, seed: number) {
  const rand = mulberry32(seed);
  const today = new Date(2026, 8, 27); // dimanche : semaine complète pour une comparaison honnête
  today.setHours(0, 0, 0, 0);
  const start = addDays(today, -(DAYS_BACK - 1));

  const workedDays = new Set<string>();
  const weekMinutes = new Map<string, number>();
  const dayMinutes = new Map<string, number>(); // pour le graphique de la dernière semaine
  const owned = new Map<number, Capture>();
  let sessions = 0;
  let totalCaptures = 0;
  let totalMinutes = 0;

  for (let d = new Date(start); d <= today; d = addDays(d, 1)) {
    if (!WORK_DAYS.includes(isoDay(d))) continue;
    const { play, minutes } = persona.daily(rand);
    if (!play) continue;

    // même logique que SessionsService.complete() : streak d'AVANT cette session
    // (l'objectif hebdo n'influence plus le tirage, cf. capture.config.ts)
    const streakDays = computeStreak(workedDays, WORK_DAYS, d);
    const cap = rarityCapFor(streakDays);

    const picks = rollCaptures(pool as never, minutes, rand, cap);
    sessions++;
    totalCaptures += picks.length;
    totalMinutes += minutes;
    for (const p of picks) {
      const prev = owned.get(p.id);
      const iso = d.toISOString();
      if (prev) {
        prev.count++;
        prev.level = Math.min(prev.level + 1, CAPTURE_CONFIG.maxLevel);
        prev.lastAt = iso;
      } else {
        owned.set(p.id, { pokemonId: p.id, level: 1, count: 1, firstAt: iso, lastAt: iso });
      }
    }

    const key = dayKey(d);
    workedDays.add(key);
    const wk = dayKey(startOfWeek(d));
    weekMinutes.set(wk, (weekMinutes.get(wk) ?? 0) + minutes);
    dayMinutes.set(key, (dayMinutes.get(key) ?? 0) + minutes);
  }

  const streakDays = computeStreak(workedDays, WORK_DAYS, today);
  const weeklyGoalMet = (weekMinutes.get(dayKey(startOfWeek(today))) ?? 0) >= WEEKLY_GOAL;

  // dernière semaine complète (lundi → dimanche) pour le graphique
  const weekStart = startOfWeek(today);
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    return {
      isoDay: isoDay(day),
      isWorkDay: WORK_DAYS.includes(isoDay(day)),
      minutes: dayMinutes.get(dayKey(day)) ?? 0,
    };
  });

  return {
    key: persona.key,
    name: persona.name,
    blurb: persona.blurb,
    streakDays,
    weeklyGoalMet,
    weeklyGoalMinutes: WEEKLY_GOAL,
    dailyGoalMinutes: Math.round(WEEKLY_GOAL / WORK_DAYS.length),
    week,
    sessions,
    totalMinutes,
    totalCaptures,
    species: owned.size,
    pokemon: [...owned.values()].sort((a, b) => b.count - a.count || a.pokemonId - b.pokemonId),
  };
}

const results = personas.map((p, i) => simulate(p, 1000 + i * 777));
console.log(JSON.stringify(results));
