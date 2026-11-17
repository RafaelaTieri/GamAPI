import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './database/database.module';
import { StatementsModule } from './statements/statements.module';
import { ChallengesModule } from './challenges/challenge.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { BadgesModule } from './badges/badges.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        DatabaseModule,
        StatementsModule,
        ChallengesModule,
        ConfigurationModule,
        LeaderboardModule,
        BadgesModule,
    ],
})
export class AppModule {}
