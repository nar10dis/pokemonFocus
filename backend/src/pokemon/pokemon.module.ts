import { Global, Module } from '@nestjs/common';
import { PokemonController } from './pokemon.controller.js';
import { PokemonService } from './pokemon.service.js';

@Global()
@Module({
  controllers: [PokemonController],
  providers: [PokemonService],
  exports: [PokemonService],
})
export class PokemonModule {}
