import { Body, Controller, Param, Patch, Post } from '@nestjs/common';

import { CreateChallengeUseCase } from '../application/create-challenge.use.case';
import { UpdateChallengePointsUseCase } from '../application/update-challenge-points.use.case';

import type {
    TChallenge,
    TCreateChallenge,
} from '../../challenges/domain/challenge.entities';

@Controller('challenges')
export class ChallengesConfigurationController {
    constructor(
        private readonly createChallengeUseCase: CreateChallengeUseCase,
        private readonly updateChallengePointsUseCase: UpdateChallengePointsUseCase,
    ) {}

    @Post()
    async create(@Body() params: TCreateChallenge): Promise<TChallenge> {
        return this.createChallengeUseCase.execute(params);
    }

    @Patch(':id/points')
    async updatePoints(
        @Param('id') id: string,
        @Body('points') points: number,
    ): Promise<TChallenge> {
        return this.updateChallengePointsUseCase.execute(id, points);
    }
}
