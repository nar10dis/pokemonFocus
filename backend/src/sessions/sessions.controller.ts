import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { UserId } from '../auth/user-id.decorator.js';
import { ListSessionsQuery, StartSessionDto } from './sessions.dto.js';
import { SessionsService } from './sessions.service.js';

@Controller('sessions')
@UseGuards(AuthGuard)
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  start(@UserId() userId: number, @Body() dto: StartSessionDto) {
    return this.sessions.start(userId, dto);
  }

  /** sessions terminées sur une période (pour les stats) */
  @Get()
  list(@UserId() userId: number, @Query() query: ListSessionsQuery) {
    return this.sessions.list(userId, query);
  }

  @Get('active')
  active(@UserId() userId: number) {
    return this.sessions.active(userId);
  }

  @Get(':id')
  get(@UserId() userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.sessions.get(userId, id);
  }

  @Post(':id/pause')
  @HttpCode(200)
  pause(@UserId() userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.sessions.pause(userId, id);
  }

  @Post(':id/resume')
  @HttpCode(200)
  resume(@UserId() userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.sessions.resume(userId, id);
  }

  @Post(':id/abandon')
  @HttpCode(200)
  abandon(@UserId() userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.sessions.abandon(userId, id);
  }

  @Post(':id/complete')
  @HttpCode(200)
  complete(@UserId() userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.sessions.complete(userId, id);
  }
}
