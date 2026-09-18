import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { UserId } from '../auth/user-id.decorator.js';
import { CreateThemeDto, UpdateThemeDto } from './themes.dto.js';
import { ThemesService } from './themes.service.js';

@Controller('themes')
@UseGuards(AuthGuard)
export class ThemesController {
  constructor(private readonly themes: ThemesService) {}

  @Get()
  list(@UserId() userId: number) {
    return this.themes.list(userId);
  }

  @Post()
  create(@UserId() userId: number, @Body() dto: CreateThemeDto) {
    return this.themes.create(userId, dto);
  }

  @Patch(':id')
  update(
    @UserId() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateThemeDto,
  ) {
    return this.themes.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@UserId() userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.themes.remove(userId, id);
  }
}
