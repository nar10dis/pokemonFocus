import { Injectable } from '@nestjs/common';
import type { Pokemon } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const REGIONS = [
  'Kanto',
  'Johto',
  'Hoenn',
  'Sinnoh',
  'Unys',
  'Kalos',
  'Alola',
  'Galar',
] as const;

@Injectable()
export class PokemonService {
  private cache: Pokemon[] | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** Pokédex complet (données statiques, gardées en mémoire) */
  async all(): Promise<Pokemon[]> {
    this.cache ??= await this.prisma.pokemon.findMany({ orderBy: { id: 'asc' } });
    return this.cache;
  }

  async byRegion(region: string) {
    return (await this.all()).filter((p) => p.region === region);
  }
}
