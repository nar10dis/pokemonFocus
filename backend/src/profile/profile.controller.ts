import { Body, Controller, Get, Patch, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { UserId } from '../auth/user-id.decorator.js';
import { SetFavoritesDto, UpdateProfileDto } from './profile.dto.js';
import { ProfileService } from './profile.service.js';

@Controller('me')
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get('profile')
  get(@UserId() userId: number) {
    return this.profile.profile(userId);
  }

  @Patch()
  update(@UserId() userId: number, @Body() dto: UpdateProfileDto) {
    return this.profile.update(userId, dto);
  }

  @Get('titles')
  titles(@UserId() userId: number) {
    return this.profile.titles(userId);
  }

  @Get('pokemon')
  collection(@UserId() userId: number) {
    return this.profile.collection(userId);
  }

  @Put('favorites')
  setFavorites(@UserId() userId: number, @Body() dto: SetFavoritesDto) {
    return this.profile.setFavorites(userId, dto);
  }
}
