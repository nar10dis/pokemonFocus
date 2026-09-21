import { Injectable } from '@nestjs/common';
import type { Pokemon } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Toutes les régions, y compris celles qu'on n'expose pas encore (validation). */
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

/** Les deux dernières générations restent en base mais ne sont pas proposées. */
export const HIDDEN_REGIONS: readonly string[] = ['Alola', 'Galar'];

/** Régions proposées au client. */
export const VISIBLE_REGIONS = REGIONS.filter((r) => !HIDDEN_REGIONS.includes(r));

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
