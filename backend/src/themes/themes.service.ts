import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateThemeDto, UpdateThemeDto } from './themes.dto.js';

@Injectable()
export class ThemesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: number) {
    return this.prisma.theme.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  }

  async create(userId: number, dto: CreateThemeDto) {
    return this.uniqueName(() => this.prisma.theme.create({ data: { ...dto, userId } }));
  }

  async update(userId: number, id: number, dto: UpdateThemeDto) {
    await this.ensureOwned(userId, id);
    return this.uniqueName(() => this.prisma.theme.update({ where: { id }, data: dto }));
  }

  async remove(userId: number, id: number) {
    await this.ensureOwned(userId, id);
    await this.prisma.theme.delete({ where: { id } });
  }

  async ensureOwned(userId: number, id: number) {
    const theme = await this.prisma.theme.findFirst({ where: { id, userId } });
    if (!theme) throw new NotFoundException('Thème introuvable');
    return theme;
  }

  private async uniqueName<T>(fn: () => Promise<T>) {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
        throw new ConflictException('Tu as déjà un thème avec ce nom');
      throw e;
    }
  }
}
