import { Controller, Get } from '@nestjs/common';
import { PokemonService, REGIONS } from './pokemon.service.js';

@Controller('pokemon')
export class PokemonController {
  constructor(private readonly pokemon: PokemonService) {}

  @Get()
  all() {
    return this.pokemon.all();
  }

  @Get('regions')
  regions() {
    return REGIONS;
  }
}
