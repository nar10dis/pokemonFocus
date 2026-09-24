import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { addDays, computeStreak, dayKey, startOfWeek } from './streak.js';

export type UserStats = {
  totalMinutes: number;
  sessions: number;
  captures: number;
  species: number;
  legendaries: number;
  mythicals: number;
};

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async forUser(userId: number): Promise<UserStats> {
    const [sessions, captures, owned] = await Promise.all([
      this.prisma.workSession.aggregate({
        where: { userId, status: 'COMPLETED' },
        _sum: { plannedMinutes: true },
        _count: true,
      }),
      this.prisma.sessionCapture.count({
        where: { session: { userId, status: 'COMPLETED' } },
      }),
      this.prisma.ownedPokemon.findMany({
        where: { userId },
        select: { pokemon: { select: { legendary: true, mythical: true } } },
      }),
    ]);
    return {
      totalMinutes: sessions._sum.plannedMinutes ?? 0,
      sessions: sessions._count,
      captures,
      species: owned.length,
      legendaries: owned.filter((o) => o.pokemon.legendary).length,
      mythicals: owned.filter((o) => o.pokemon.mythical).length,
    };
  }

  /** jours de travail d'affilée (les jours de repos définis sur le profil ne comptent pas) */
  async streak(userId: number, workDays: number[]): Promise<number> {
    const sessions = await this.prisma.workSession.findMany({
      where: { userId, status: 'COMPLETED' },
      select: { endedAt: true },
      orderBy: { endedAt: 'desc' },
      take: 400, // largement assez pour couvrir n'importe quelle série réaliste
    });
    const workedDays = new Set(
      sessions.filter((s) => s.endedAt !== null).map((s) => dayKey(s.endedAt as Date)),
    );
    return computeStreak(workedDays, workDays);
  }

  /** minutes plannifiées déjà complétées cette semaine (lundi 00:00 → maintenant) */
  async weeklyMinutes(userId: number, at = new Date()): Promise<number> {
    const from = startOfWeek(at);
    const to = addDays(from, 7);
    const { _sum } = await this.prisma.workSession.aggregate({
      where: { userId, status: 'COMPLETED', endedAt: { gte: from, lt: to } },
      _sum: { plannedMinutes: true },
    });
    return _sum.plannedMinutes ?? 0;
  }
}
