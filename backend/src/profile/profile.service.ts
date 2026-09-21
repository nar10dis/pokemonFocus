import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StatsService } from '../stats/stats.service.js';
import { isUnlocked, TITLE_WORDS, titleLabel } from '../titles/titles.js';
import type { SetFavoritesDto, UpdateProfileDto } from './profile.dto.js';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
  ) {}

  favorites(userId: number) {
    return this.prisma.ownedPokemon.findMany({
      where: { userId, favoriteSlot: { not: null } },
      orderBy: { favoriteSlot: 'asc' },
      select: { favoriteSlot: true, level: true, pokemon: true },
    });
  }

  async profile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    const [stats, favorites] = await Promise.all([
      this.stats.forUser(userId),
      this.favorites(userId),
    ]);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      titleNoun: user.titleNoun,
      titleAdjective: user.titleAdjective,
      title: titleLabel(user.titleNoun, user.titleAdjective),
      favoriteRegion: user.favoriteRegion,
      weeklyGoalMinutes: user.weeklyGoalMinutes,
      workDays: [...user.workDays].sort((a, b) => a - b),
      stats,
      favorites,
    };
  }

  async titles(userId: number) {
    const stats = await this.stats.forUser(userId);
    return TITLE_WORDS.map((w) => ({ ...w, unlocked: isUnlocked(w, stats) }));
  }

  async update(userId: number, dto: UpdateProfileDto) {
    if (dto.titleNoun !== undefined || dto.titleAdjective !== undefined) {
      const stats = await this.stats.forUser(userId);
      for (const [id, kind] of [
        [dto.titleNoun, 'noun'],
        [dto.titleAdjective, 'adjective'],
      ] as const) {
        if (id === undefined) continue;
        const word = TITLE_WORDS.find((w) => w.id === id && w.kind === kind);
        if (!word) throw new BadRequestException('Mot inconnu');
        if (!isUnlocked(word, stats))
          throw new BadRequestException(`« ${word.label} » n'est pas encore débloqué`);
      }
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { ...dto, ...(dto.workDays && { workDays: [...dto.workDays].sort((a, b) => a - b) }) },
    });
    return this.profile(userId);
  }

  collection(userId: number) {
    return this.prisma.ownedPokemon.findMany({
      where: { userId },
      orderBy: { pokemonId: 'asc' },
      select: {
        pokemonId: true,
        level: true,
        captureCount: true,
        favoriteSlot: true,
        firstCapturedAt: true,
        lastCapturedAt: true,
      },
    });
  }

  async setFavorites(userId: number, { pokemonIds }: SetFavoritesDto) {
    const owned = await this.prisma.ownedPokemon.count({
      where: { userId, pokemonId: { in: pokemonIds } },
    });
    if (owned !== pokemonIds.length)
      throw new BadRequestException('Tu ne peux mettre en favori que des Pokémon capturés');
    await this.prisma.$transaction([
      this.prisma.ownedPokemon.updateMany({
        where: { userId, favoriteSlot: { not: null } },
        data: { favoriteSlot: null },
      }),
      ...pokemonIds.map((pokemonId, i) =>
        this.prisma.ownedPokemon.update({
          where: { userId_pokemonId: { userId, pokemonId } },
          data: { favoriteSlot: i + 1 },
        }),
      ),
    ]);
    return this.favorites(userId);
  }
}
