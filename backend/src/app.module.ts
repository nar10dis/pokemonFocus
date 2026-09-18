import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { FriendsModule } from './friends/friends.module.js';
import { PokemonModule } from './pokemon/pokemon.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { SessionsModule } from './sessions/sessions.module.js';
import { StatsModule } from './stats/stats.module.js';
import { ThemesModule } from './themes/themes.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PokemonModule,
    StatsModule,
    ProfileModule,
    ThemesModule,
    SessionsModule,
    FriendsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
