import { IsString, MinLength } from 'class-validator';

export class DeleteAccountDto {
  @IsString()
  @MinLength(1, { message: 'Mot de passe requis' })
  password: string;
}
