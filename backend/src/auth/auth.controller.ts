import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { CookieOptions, Response } from 'express';
import { AUTH_COOKIE, AUTH_TTL_SECONDS } from './auth.constants.js';
import { AuthGuard, type AuthedRequest } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { UserId } from './user-id.decorator.js';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.auth.register(dto);
    res.cookie(AUTH_COOKIE, token, { ...cookieOptions, maxAge: AUTH_TTL_SECONDS * 1000 });
    return user;
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, token } = await this.auth.login(dto);
    res.cookie(AUTH_COOKIE, token, { ...cookieOptions, maxAge: AUTH_TTL_SECONDS * 1000 });
    return user;
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE, cookieOptions);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: AuthedRequest) {
    return this.auth.me(req.userId);
  }

  /** suppression définitive du compte (RGPD), mot de passe redemandé */
  @Delete('me')
  @UseGuards(AuthGuard, ThrottlerGuard)
  @HttpCode(204)
  async deleteAccount(
    @UserId() userId: number,
    @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.deleteAccount(userId, dto.password);
    res.clearCookie(AUTH_COOKIE, cookieOptions);
  }
}
