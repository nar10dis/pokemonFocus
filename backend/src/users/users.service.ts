import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma, User } from '../generated/prisma/client.js';

export type PublicUser = Omit<User, 'password'>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmailOrUsername(email: string, username: string) {
    return this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  touchLastLogin(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  /** les données liées (Pokémon, thèmes, sessions, amitiés) partent en cascade */
  delete(id: number) {
    return this.prisma.user.delete({ where: { id } });
  }

  static toPublic({ password: _password, ...user }: User): PublicUser {
    return user;
  }
}
