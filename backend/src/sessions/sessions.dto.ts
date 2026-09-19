import { OmitType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { REGIONS } from '../pokemon/pokemon.service.js';
import { SESSION_MAX_MINUTES, SESSION_MIN_MINUTES } from './capture.config.js';

export class StartSessionDto {
  @IsIn(REGIONS, { message: 'Région inconnue' })
  region: string;

  @IsInt()
  @Min(SESSION_MIN_MINUTES, { message: `Durée minimum : ${SESSION_MIN_MINUTES} min` })
  @Max(SESSION_MAX_MINUTES, { message: `Durée maximum : ${SESSION_MAX_MINUTES} min` })
  plannedMinutes: number;

  @IsOptional()
  @IsInt()
  themeId?: number;
}

/** la durée est imposée par le serveur (1 h) */
export class SimulateSessionDto extends OmitType(StartSessionDto, ['plannedMinutes'] as const) {}

export class ListSessionsQuery {
  @Type(() => Date)
  @IsDate()
  from: Date;

  @Type(() => Date)
  @IsDate()
  to: Date;
}
