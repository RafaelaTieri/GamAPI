import { Injectable } from '@nestjs/common';

import { ProcessEarnedBadgesUseCase } from '../../badges/application/process-earned-badges.use.case';
import { GetChallengePointsUseCase } from '../../challenges/application/get-challenge-points.use.case';
import { IdempotentStatementUseCase } from '../../idempotency/application/idempotent-statement.use.case';

import type { TXApiStatement } from '../domain/statements.entities';
import { GeneratePointsStatementUseCase } from './generate-points-statement.use.case';
import { ValidateStatementUseCase } from './validate-statement.use.case';

@Injectable()
export class CreateStatementUseCase {
    constructor(
        private readonly validateStatementUseCase: ValidateStatementUseCase,
        private readonly getChallengePointsUseCase: GetChallengePointsUseCase,
        private readonly generatePointsStatementUseCase: GeneratePointsStatementUseCase,
        private readonly processEarnedBadgesUseCase: ProcessEarnedBadgesUseCase,
        private readonly idempotency: IdempotentStatementUseCase,
    ) {}

    async execute(originalStatement: TXApiStatement): Promise<TXApiStatement> {
        this.validateStatementUseCase.execute(originalStatement);

        const storedOriginalStatement = await this.idempotency.findById(
            originalStatement.id,
        );

        if (storedOriginalStatement) {
            this.idempotency.assertOriginalMatches(
                storedOriginalStatement,
                originalStatement,
            );
        }

        const existingPointsReward = await this.idempotency.findExistingPoints(
            originalStatement.actor.mbox,
            originalStatement.id,
        );

        const challengePoints = existingPointsReward
            ? null
            : await this.getChallengePointsUseCase.execute(originalStatement);

        await this.idempotency.ensureOriginal(originalStatement);

        let pointsRewardStatement = existingPointsReward;

        if (!pointsRewardStatement) {
            const generatedPointsStatement =
                this.generatePointsStatementUseCase.execute(
                    originalStatement,
                    challengePoints!,
                );

            const pointsRegistrationResult =
                await this.idempotency.ensurePoints(generatedPointsStatement);

            pointsRewardStatement = pointsRegistrationResult.statement;
        }

        await this.processEarnedBadgesUseCase.execute(
            originalStatement,
            pointsRewardStatement,
        );

        return pointsRewardStatement;
    }
}
