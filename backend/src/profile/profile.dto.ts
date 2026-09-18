import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { REGIONS } from '../pokemon/pokemon.service.js';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  titleNoun?: string;

  @IsOptional()
  @IsString()
  titleAdjective?: string;

  @IsOptional()
  @IsIn(REGIONS, { message: 'Région inconnue' })
  favoriteRegion?: string;

  @IsOptional()
  @IsInt()
  @Min(30, { message: 'Objectif minimum : 30 min par semaine' })
  @Max(100 * 60, { message: 'Objectif maximum : 100 h par semaine' })
  weeklyGoalMinutes?: number;
}

export class SetFavoritesDto {
  @IsArray()
  @ArrayMaxSize(6, { message: '6 Pokémon favoris maximum' })
  @ArrayUnique()
  @IsInt({ each: true })
  pokemonIds: number[];
}
