import { isDeepStrictEqual } from 'node:util';

import {
    ConflictException,
    Injectable,
    ServiceUnavailableException,
} from '@nestjs/common';
import { isAxiosError } from 'axios';

import type { TXApiStatement } from '../../statements/domain/statements.entities';
import {
    XAPI_ACTIVITY_TYPES,
    XAPI_VERBS,
} from '../../xapi/domain/xapi.constants';
import { StatementIdempotencyGateway } from '../domain/statement-idempotency.gateway';

type TStatementCategory = 'original' | 'points' | 'badge';

type TStatementWriteResult = {
    statement: TXApiStatement;
    created: boolean;
};

@Injectable()
export class IdempotentStatementUseCase {
    constructor(
        private readonly statementGateway: StatementIdempotencyGateway,
    ) {}

    async findById(statementId: string): Promise<TXApiStatement | null> {
        return this.statementGateway.getById(statementId);
    }

    assertOriginalMatches(
        storedStatement: TXApiStatement,
        incomingStatement: TXApiStatement,
    ): void {
        if (!this.hasSameOriginalContent(storedStatement, incomingStatement)) {
            throw new ConflictException(
                'Já existe um statement xAPI com este identificador e conteúdo diferente.',
            );
        }
    }

    async findExistingPoints(
        actorMbox: string,
        originalStatementId: string,
    ): Promise<TXApiStatement | null> {
        const pointsRewards = await this.statementGateway.getByActorAndVerb(
            actorMbox,
            XAPI_VERBS.EARNED_POINTS,
        );

        const rewardsForCompletion = pointsRewards.filter(
            (pointsReward) =>
                pointsReward.verb.id === XAPI_VERBS.EARNED_POINTS &&
                pointsReward.actor.mbox === actorMbox &&
                pointsReward.context?.statement?.id === originalStatementId,
        );

        rewardsForCompletion.sort((firstReward, secondReward) =>
            (firstReward.timestamp ?? '').localeCompare(
                secondReward.timestamp ?? '',
            ),
        );

        return rewardsForCompletion[0] ?? null;
    }

    async ensureOriginal(
        statement: TXApiStatement,
    ): Promise<TStatementWriteResult> {
        return this.saveStatementIfNeeded(statement, 'original');
    }

    async ensurePoints(
        statement: TXApiStatement,
    ): Promise<TStatementWriteResult> {
        return this.saveStatementIfNeeded(statement, 'points');
    }

    async ensureBadge(
        statement: TXApiStatement,
    ): Promise<TStatementWriteResult> {
        return this.saveStatementIfNeeded(statement, 'badge');
    }

    private async saveStatementIfNeeded(
        incomingStatement: TXApiStatement,
        statementCategory: TStatementCategory,
    ): Promise<TStatementWriteResult> {
        const storedStatement = await this.statementGateway.getById(
            incomingStatement.id,
        );

        if (storedStatement) {
            this.assertMatches(
                storedStatement,
                incomingStatement,
                statementCategory,
            );

            return {
                statement: storedStatement,
                created: false,
            };
        }

        try {
            await this.statementGateway.create(incomingStatement);

            return {
                statement: incomingStatement,
                created: true,
            };
        } catch (error) {
            if (!isAxiosError(error) || error.response?.status !== 409) {
                throw error;
            }
        }

        const storedStatementAfterConflict =
            await this.findStoredStatementAfterConflict(incomingStatement.id);

        this.assertMatches(
            storedStatementAfterConflict,
            incomingStatement,
            statementCategory,
        );

        return {
            statement: storedStatementAfterConflict,
            created: false,
        };
    }

    private async findStoredStatementAfterConflict(
        statementId: string,
    ): Promise<TXApiStatement> {
        for (let attempt = 0; attempt < 5; attempt++) {
            const storedStatement =
                await this.statementGateway.getById(statementId);

            if (storedStatement) {
                return storedStatement;
            }

            await new Promise((resolve) =>
                setTimeout(resolve, 100 * (attempt + 1)),
            );
        }

        throw new ServiceUnavailableException(
            'O Ralph informou um conflito, mas o statement xAPI ainda não está disponível para consulta. Reenvie a requisição com o mesmo identificador.',
        );
    }

    private assertMatches(
        storedStatement: TXApiStatement,
        incomingStatement: TXApiStatement,
        statementCategory: TStatementCategory,
    ): void {
        if (statementCategory === 'original') {
            this.assertOriginalMatches(storedStatement, incomingStatement);
            return;
        }

        const hasSameActor =
            storedStatement.actor.mbox === incomingStatement.actor.mbox;

        const hasSameVerb =
            storedStatement.verb.id === incomingStatement.verb.id;

        const hasSameObject =
            storedStatement.object.id === incomingStatement.object.id;

        const hasSameProject =
            this.getProjectIri(storedStatement) ===
            this.getProjectIri(incomingStatement);

        const hasSameCompletionReference =
            statementCategory !== 'points' ||
            storedStatement.context?.statement?.id ===
                incomingStatement.context?.statement?.id;

        if (
            !hasSameActor ||
            !hasSameVerb ||
            !hasSameObject ||
            !hasSameCompletionReference ||
            (statementCategory === 'badge' && !hasSameProject)
        ) {
            throw new ConflictException(
                'O identificador da recompensa já está associado a dados incompatíveis.',
            );
        }
    }

    private getProjectIri(statement: TXApiStatement): string | null {
        const groupingActivities =
            statement.context?.contextActivities?.grouping ?? [];

        return (
            groupingActivities.find(
                (activity) =>
                    activity.definition?.type === XAPI_ACTIVITY_TYPES.PROJECT,
            )?.id ?? null
        );
    }

    private hasSameOriginalContent(
        storedStatement: TXApiStatement,
        incomingStatement: TXApiStatement,
    ): boolean {
        const fieldsToCompare = [
            'id',
            'actor',
            'verb',
            'object',
            'context',
            'result',
        ] as const;

        return (
            fieldsToCompare.every((field) =>
                isDeepStrictEqual(
                    this.normalizeForComparison(storedStatement[field]),
                    this.normalizeForComparison(incomingStatement[field]),
                ),
            ) &&
            (!incomingStatement.timestamp ||
                incomingStatement.timestamp === storedStatement.timestamp)
        );
    }

    private normalizeForComparison(value: unknown): unknown {
        if (Array.isArray(value)) {
            return value.map((item) => this.normalizeForComparison(item));
        }

        if (value && typeof value === 'object') {
            return Object.fromEntries(
                Object.entries(value)
                    .filter(
                        ([key, item]) =>
                            item !== undefined &&
                            !(
                                key === 'objectType' &&
                                ['Agent', 'Activity', 'StatementRef'].includes(
                                    String(item),
                                )
                            ),
                    )
                    .sort(([firstKey], [secondKey]) =>
                        firstKey.localeCompare(secondKey),
                    )
                    .map(([key, item]) => [
                        key,
                        this.normalizeForComparison(item),
                    ]),
            );
        }

        return value;
    }
}
