import { Controller, Get, Param, Query } from '@nestjs/common';

import { GetProjectLeaderboardUseCase } from '../application/get-project-leaderboard.use.case';
import type { TProjectLeaderboard } from '../domain/leaderboard.entities';

@Controller('projects')
export class LeaderboardController {
    constructor(
        private readonly getProjectLeaderboardUseCase: GetProjectLeaderboardUseCase,
    ) {}

    @Get(':projectId/leaderboard')
    async getProjectLeaderboard(
        @Param('projectId') projectId: string,
        @Query('limit') requestedLimit?: string,
    ): Promise<TProjectLeaderboard> {
        const leaderboardLimit =
            requestedLimit === undefined ? 10 : Number(requestedLimit);

        return this.getProjectLeaderboardUseCase.execute(
            projectId,
            leaderboardLimit,
        );
    }
}
