import { PartialType } from '@nestjs/mapped-types';
import { IsHexColor, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateThemeDto {
  @IsString()
  @MinLength(1, { message: 'Le nom est requis' })
  @MaxLength(30, { message: '30 caractères maximum' })
  name: string;

  @IsHexColor({ message: 'Couleur invalide' })
  color: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8)
  emoji: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(100 * 60)
  weeklyGoalMinutes?: number | null;
}

export class UpdateThemeDto extends PartialType(CreateThemeDto) {}
