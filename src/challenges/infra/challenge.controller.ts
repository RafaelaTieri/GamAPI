import { Body, Controller, Post } from '@nestjs/common';

import type { TXApiStatement } from '../../statements/domain/statements.entities';

import { GetChallengePointsUseCase } from '../application/get-challenge-points.use.case';

@Controller('challenges')
export class ChallengesController {
    constructor(
        private readonly getChallengePointsUseCase: GetChallengePointsUseCase,
    ) {}

    @Post('points')
    async getPoints(
        @Body() statement: TXApiStatement,
    ): Promise<{ points: number }> {
        const points = await this.getChallengePointsUseCase.execute(statement);

        return { points };
    }
}
