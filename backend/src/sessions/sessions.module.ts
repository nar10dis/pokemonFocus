import { Module } from '@nestjs/common';
import { ThemesModule } from '../themes/themes.module.js';
import { SessionsController } from './sessions.controller.js';
import { SessionsService } from './sessions.service.js';

@Module({
  imports: [ThemesModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
