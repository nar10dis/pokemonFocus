import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AUTH_COOKIE } from './auth.constants.js';

export type AuthedRequest = Request & { userId: number };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token: unknown = req.cookies?.[AUTH_COOKIE];
    if (typeof token !== 'string') throw new UnauthorizedException();
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number }>(token);
      req.userId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
