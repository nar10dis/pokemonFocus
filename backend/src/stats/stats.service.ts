import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

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
}
