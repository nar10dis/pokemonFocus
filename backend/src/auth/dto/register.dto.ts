import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3, { message: 'Le pseudo doit faire au moins 3 caractères' })
  @MaxLength(20, { message: 'Le pseudo doit faire au plus 20 caractères' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Le pseudo ne peut contenir que lettres, chiffres, _ et -',
  })
  username: string;

  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit faire au moins 8 caractères' })
  @MaxLength(72, { message: 'Le mot de passe doit faire au plus 72 caractères' })
  password: string;
}
