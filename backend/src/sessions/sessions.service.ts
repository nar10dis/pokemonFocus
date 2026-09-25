import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { WorkSession } from '../generated/prisma/client.js';
import { PokemonService } from '../pokemon/pokemon.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StatsService } from '../stats/stats.service.js';
import { ThemesService } from '../themes/themes.service.js';
import { levelUpCaptures, rarityCapFor, rollCaptures } from './capture.js';
import type { ListSessionsQuery, StartSessionDto } from './sessions.dto.js';

/** marge tolérée entre l'horloge du client et celle du serveur */
const COMPLETE_TOLERANCE_MS = 5_000;

const SIMULATED_MINUTES = 60;

const withDetails = {
  theme: true,
  captures: { include: { pokemon: true }, orderBy: { id: 'asc' } },
} as const;

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pokemon: PokemonService,
    private readonly themes: ThemesService,
    private readonly stats: StatsService,
  ) {}

  /** temps de travail effectif écoulé, pauses exclues */
  static elapsedMs(s: WorkSession, now = new Date()) {
    const end = s.pausedAt ?? now;
    return end.getTime() - s.startedAt.getTime() - s.pausedMs;
  }

  private serialize<T extends WorkSession>(s: T) {
    return { ...s, elapsedMs: SessionsService.elapsedMs(s) };
  }

  async start(userId: number, dto: StartSessionDto) {
    if (await this.findActive(userId))
      throw new ConflictException('Une session est déjà en cours');
    if (dto.themeId !== undefined) await this.themes.ensureOwned(userId, dto.themeId);
    const s = await this.prisma.workSession.create({
      data: { userId, region: dto.region, plannedMinutes: dto.plannedMinutes, themeId: dto.themeId },
      include: withDetails,
    });
    return this.serialize(s);
  }

  private findActive(userId: number) {
    return this.prisma.workSession.findFirst({
      where: { userId, status: { in: ['RUNNING', 'PAUSED'] } },
      include: withDetails,
    });
  }

  async active(userId: number) {
    const s = await this.findActive(userId);
    return s ? this.serialize(s) : null;
  }

  async get(userId: number, id: number) {
    const s = await this.prisma.workSession.findFirst({
      where: { id, userId },
      include: withDetails,
    });
    if (!s) throw new NotFoundException('Session introuvable');
    return this.serialize(s);
  }

  async list(userId: number, { from, to }: ListSessionsQuery) {
    const sessions = await this.prisma.workSession.findMany({
      where: { userId, status: 'COMPLETED', endedAt: { gte: from, lt: to } },
      orderBy: { endedAt: 'asc' },
      include: { theme: true, _count: { select: { captures: true } } },
    });
    return sessions;
  }

  private async getActive(userId: number, id: number) {
    const s = await this.prisma.workSession.findFirst({
      where: { id, userId, status: { in: ['RUNNING', 'PAUSED'] } },
    });
    if (!s) throw new NotFoundException('Aucune session en cours');
    return s;
  }

  async pause(userId: number, id: number) {
    const s = await this.getActive(userId, id);
    if (s.status === 'PAUSED') return this.get(userId, id);
    await this.prisma.workSession.update({
      where: { id },
      data: { status: 'PAUSED', pausedAt: new Date() },
    });
    return this.get(userId, id);
  }

  async resume(userId: number, id: number) {
    const s = await this.getActive(userId, id);
    if (s.status === 'RUNNING' || !s.pausedAt) return this.get(userId, id);
    await this.prisma.workSession.update({
      where: { id },
      data: {
        status: 'RUNNING',
        pausedAt: null,
        pausedMs: s.pausedMs + (Date.now() - s.pausedAt.getTime()),
      },
    });
    return this.get(userId, id);
  }

  /** abandon : rien n'est gardé (ni temps, ni capture) */
  async abandon(userId: number, id: number) {
    await this.getActive(userId, id);
    await this.prisma.workSession.update({
      where: { id },
      data: { status: 'ABANDONED', endedAt: new Date() },
    });
    return this.get(userId, id);
  }

  /**
   * Test uniquement : crée une session d'1 h déjà écoulée et la termine (vraies captures).
   * Désactivé en production.
   */
  async simulate(userId: number, dto: Omit<StartSessionDto, 'plannedMinutes'>) {
    if (process.env.NODE_ENV === 'production') throw new NotFoundException();
    const s = await this.start(userId, { ...dto, plannedMinutes: SIMULATED_MINUTES });
    await this.prisma.workSession.update({
      where: { id: s.id },
      data: { startedAt: new Date(Date.now() - SIMULATED_MINUTES * 60_000) },
    });
    return this.complete(userId, s.id);
  }

  async complete(userId: number, id: number) {
    const s = await this.getActive(userId, id);
    if (s.status === 'PAUSED') throw new BadRequestException('La session est en pause');
    if (SessionsService.elapsedMs(s) < s.plannedMinutes * 60_000 - COMPLETE_TOLERANCE_MS)
      throw new BadRequestException("La session n'est pas encore terminée");

    // plus la série de jours travaillés d'affilée est longue, plus les rares/légendaires
    // sortent (l'objectif hebdo n'entre plus en jeu ici : un objectif minimum trivial
    // serait toujours atteint et rendrait le bonus gratuit — cf. capture.config.ts)
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const streakDays = await this.stats.streak(userId, user.workDays);
    const maxRarityCap = rarityCapFor(streakDays);

    const picks = rollCaptures(
      await this.pokemon.byRegion(s.region),
      s.plannedMinutes,
      Math.random,
      maxRarityCap,
    );

    await this.prisma.$transaction(async (tx) => {
      // on repasse le statut en premier : un double appel concurrent échoue ici
      const { count } = await tx.workSession.updateMany({
        where: { id, status: 'RUNNING' },
        data: { status: 'COMPLETED', endedAt: new Date(), streakDays },
      });
      if (count === 0) throw new ConflictException('Session déjà terminée');

      const pokemonIds = picks.map((p) => p.id);
      const owned = await tx.ownedPokemon.findMany({
        where: { userId, pokemonId: { in: pokemonIds } },
        select: { pokemonId: true, level: true },
      });
      const captures = levelUpCaptures(pokemonIds, new Map(owned.map((o) => [o.pokemonId, o.level])));

      // état final par Pokémon : dernier niveau atteint et nombre de captures
      const totals = new Map<number, { level: number; count: number }>();
      for (const c of captures)
        totals.set(c.pokemonId, { level: c.levelAfter, count: (totals.get(c.pokemonId)?.count ?? 0) + 1 });

      const wasOwned = new Set(owned.map((o) => o.pokemonId));
      const now = new Date();
      await tx.ownedPokemon.createMany({
        data: [...totals]
          .filter(([pokemonId]) => !wasOwned.has(pokemonId))
          .map(([pokemonId, { level, count }]) => ({ userId, pokemonId, level, captureCount: count })),
      });
      for (const [pokemonId, { level, count }] of totals) {
        if (!wasOwned.has(pokemonId)) continue;
        await tx.ownedPokemon.update({
          where: { userId_pokemonId: { userId, pokemonId } },
          data: { level, captureCount: { increment: count }, lastCapturedAt: now },
        });
      }
      await tx.sessionCapture.createMany({
        data: captures.map((c, i) => ({
          sessionId: id,
          ...c,
          dropChance: picks[i].dropChance,
          baseDropChance: picks[i].baseDropChance,
        })),
      });
    });
    return this.get(userId, id);
  }
}
