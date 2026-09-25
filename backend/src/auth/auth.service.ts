import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.users.findByEmailOrUsername(email, dto.username);
    if (existing) {
      throw new ConflictException(
        existing.email === email
          ? 'Cet email est déjà utilisé'
          : 'Ce pseudo est déjà pris',
      );
    }
    const user = await this.users.create({
      email,
      username: dto.username,
      password: await bcrypt.hash(dto.password, 12),
      lastLoginAt: new Date(),
    });
    return { user: UsersService.toPublic(user), token: await this.sign(user.id) };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email.toLowerCase());
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }
    const updated = await this.users.touchLastLogin(user.id);
    return { user: UsersService.toPublic(updated), token: await this.sign(user.id) };
  }

  async me(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return UsersService.toPublic(user);
  }

  async deleteAccount(userId: number, password: string) {
    const user = await this.users.findById(userId);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Mot de passe incorrect');
    }
    await this.users.delete(userId);
  }

  private sign(userId: number) {
    return this.jwt.signAsync({ sub: userId });
  }
}
