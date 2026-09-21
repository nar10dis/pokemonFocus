import {
  ArrayMaxSize,
  ArrayMinSize,
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

  /// numéros ISO des jours travaillés (1 = lundi … 7 = dimanche)
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Choisis au moins un jour de travail' })
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true, message: 'Jour invalide' })
  @Max(7, { each: true, message: 'Jour invalide' })
  workDays?: number[];
}

export class SetFavoritesDto {
  @IsArray()
  @ArrayMaxSize(6, { message: '6 Pokémon favoris maximum' })
  @ArrayUnique()
  @IsInt({ each: true })
  pokemonIds: number[];
}
