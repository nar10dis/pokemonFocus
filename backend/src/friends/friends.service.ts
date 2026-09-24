import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pokemon, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { titleLabel } from '../titles/titles.js';

const publicUser = {
  id: true,
  username: true,
  lastLoginAt: true,
  titleNoun: true,
  titleAdjective: true,
  avatarColor: true,
  avatarCosmetics: true,
  avatarPokemon: true,
} as const;

type PublicUserRow = {
  id: number;
  username: string;
  lastLoginAt: Date | null;
  titleNoun: string | null;
  titleAdjective: string | null;
  avatarColor: string | null;
  avatarCosmetics: Prisma.JsonValue;
  avatarPokemon: Pokemon | null;
};

const toPublic = ({ titleNoun, titleAdjective, ...u }: PublicUserRow) => ({
  ...u,
  title: titleLabel(titleNoun, titleAdjective),
});

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  private friendIds(userId: number) {
    return this.prisma.friendship
      .findMany({
        where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
        select: { requesterId: true, addresseeId: true },
      })
      .then((rows) => rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId)));
  }

  async list(userId: number) {
    const ids = await this.friendIds(userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      orderBy: { username: 'asc' },
      select: {
        ...publicUser,
        pokemon: {
          where: { favoriteSlot: { not: null } },
          orderBy: { favoriteSlot: 'asc' },
          select: { level: true, pokemon: true },
        },
      },
    });
    const lastCaptures = await Promise.all(
      ids.map((id) =>
        this.prisma.sessionCapture.findFirst({
          where: { session: { userId: id, status: 'COMPLETED' } },
          orderBy: { capturedAt: 'desc' },
          select: { capturedAt: true, pokemon: true, session: { select: { userId: true } } },
        }),
      ),
    );
    return users.map(({ pokemon, ...u }) => {
      const last = lastCaptures.find((c) => c?.session.userId === u.id);
      return {
        ...toPublic(u),
        favorites: pokemon,
        lastCapture: last ? { capturedAt: last.capturedAt, pokemon: last.pokemon } : null,
      };
    });
  }

  async requests(userId: number) {
    const [incoming, outgoing] = await Promise.all([
      this.prisma.friendship.findMany({
        where: { addresseeId: userId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true, requester: { select: publicUser } },
      }),
      this.prisma.friendship.findMany({
        where: { requesterId: userId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true, addressee: { select: publicUser } },
      }),
    ]);
    return {
      incoming: incoming.map((r) => ({ id: r.id, createdAt: r.createdAt, user: toPublic(r.requester) })),
      outgoing: outgoing.map((r) => ({ id: r.id, createdAt: r.createdAt, user: toPublic(r.addressee) })),
    };
  }

  async send(userId: number, query: string) {
    const q = query.trim();
    const asId = /^#?\d+$/.test(q) ? Number(q.replace('#', '')) : null;
    const target = await this.prisma.user.findFirst({
      where: asId !== null ? { id: asId } : { username: { equals: q, mode: 'insensitive' } },
      select: { id: true, username: true },
    });
    if (!target) throw new NotFoundException('Aucun dresseur trouvé');
    if (target.id === userId) throw new BadRequestException("Tu ne peux pas t'ajouter toi-même");

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: target.id },
          { requesterId: target.id, addresseeId: userId },
        ],
      },
    });
    if (existing?.status === 'ACCEPTED') throw new ConflictException('Vous êtes déjà amis');
    if (existing?.requesterId === userId) throw new ConflictException('Demande déjà envoyée');
    if (existing) {
      // il m'avait déjà demandé : on accepte directement
      await this.prisma.friendship.update({ where: { id: existing.id }, data: { status: 'ACCEPTED' } });
      return { status: 'ACCEPTED' as const, username: target.username };
    }
    await this.prisma.friendship.create({ data: { requesterId: userId, addresseeId: target.id } });
    return { status: 'PENDING' as const, username: target.username };
  }

  async accept(userId: number, id: number) {
    const req = await this.prisma.friendship.findUnique({ where: { id } });
    if (!req || req.status !== 'PENDING') throw new NotFoundException('Demande introuvable');
    if (req.addresseeId !== userId) throw new ForbiddenException();
    await this.prisma.friendship.update({ where: { id }, data: { status: 'ACCEPTED' } });
  }

  /** refuser (destinataire) ou annuler (expéditeur) une demande */
  async decline(userId: number, id: number) {
    const req = await this.prisma.friendship.findUnique({ where: { id } });
    if (!req || req.status !== 'PENDING') throw new NotFoundException('Demande introuvable');
    if (req.addresseeId !== userId && req.requesterId !== userId) throw new ForbiddenException();
    await this.prisma.friendship.delete({ where: { id } });
  }

  async remove(userId: number, friendId: number) {
    const { count } = await this.prisma.friendship.deleteMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: userId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: userId },
        ],
      },
    });
    if (count === 0) throw new NotFoundException('Ami introuvable');
  }
}
