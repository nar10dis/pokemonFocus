import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { REGIONS } from '../pokemon/pokemon.service.js';

export const MAX_AVATAR_COSMETICS = 10;

export class AvatarCosmeticDto {
  /// nom du sprite dans frontend/public/sprites/cosmetics (sans .png)
  @IsString()
  @Matches(/^[a-z0-9-]{1,40}$/, { message: 'Accessoire inconnu' })
  id: string;

  @IsInt()
  @Min(0)
  @Max(100)
  x: number;

  @IsInt()
  @Min(0)
  @Max(100)
  y: number;

  /// derrière le Pokémon plutôt que devant
  @IsBoolean()
  back: boolean;
}

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

  /// Pokémon affiché en photo de profil (doit être capturé), null pour revenir à l'initiale
  @IsOptional()
  @IsInt()
  avatarPokemonId?: number | null;

  @IsOptional()
  @IsHexColor({ message: 'Couleur invalide' })
  avatarColor?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_AVATAR_COSMETICS, {
    message: `${MAX_AVATAR_COSMETICS} accessoires maximum`,
  })
  @ValidateNested({ each: true })
  @Type(() => AvatarCosmeticDto)
  avatarCosmetics?: AvatarCosmeticDto[];
}

export class SetFavoritesDto {
  @IsArray()
  @ArrayMaxSize(6, { message: '6 Pokémon favoris maximum' })
  @ArrayUnique()
  @IsInt({ each: true })
  pokemonIds: number[];
}
