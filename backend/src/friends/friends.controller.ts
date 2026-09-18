import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { UserId } from '../auth/user-id.decorator.js';
import { FriendRequestDto } from './friends.dto.js';
import { FriendsService } from './friends.service.js';

@Controller('friends')
@UseGuards(AuthGuard)
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  @Get()
  list(@UserId() userId: number) {
    return this.friends.list(userId);
  }

  @Get('requests')
  requests(@UserId() userId: number) {
    return this.friends.requests(userId);
  }

  @Post('requests')
  send(@UserId() userId: number, @Body() dto: FriendRequestDto) {
    return this.friends.send(userId, dto.query);
  }

  @Post('requests/:id/accept')
  @HttpCode(204)
  accept(@UserId() userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.friends.accept(userId, id);
  }

  @Delete('requests/:id')
  @HttpCode(204)
  decline(@UserId() userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.friends.decline(userId, id);
  }

  @Delete(':userId')
  @HttpCode(204)
  remove(@UserId() userId: number, @Param('userId', ParseIntPipe) friendId: number) {
    return this.friends.remove(userId, friendId);
  }
}
