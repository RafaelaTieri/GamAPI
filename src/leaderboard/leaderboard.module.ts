import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ConfigurationModule } from '../configuration/configuration.module';

import { GetProjectLeaderboardUseCase } from './application/get-project-leaderboard.use.case';
import { LeaderboardGateway } from './domain/leaderboard.gateway';
import { LeaderboardController } from './infra/leaderboard.controller';
import { LeaderboardHttpGateway } from './infra/leaderboard.http.gateway';

@Module({
    imports: [HttpModule, ConfigurationModule],
    controllers: [LeaderboardController],
    providers: [
        GetProjectLeaderboardUseCase,
        {
            provide: LeaderboardGateway,
            useClass: LeaderboardHttpGateway,
        },
    ],
})
export class LeaderboardModule {}
