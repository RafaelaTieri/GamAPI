import { Injectable } from '@nestjs/common';

import { IdempotentStatementUseCase } from '../../idempotency/application/idempotent-statement.use.case';
import { deterministicStatementId } from '../../common/utils/deterministic-statement-id';
import type { TXApiStatement } from '../../statements/domain/statements.entities';
import {
    XAPI_ACTIVITY_TYPES,
    XAPI_VERBS,
} from '../../xapi/domain/xapi.constants';

import type { TBadge } from '../domain/badge.entities';

@Injectable()
export class AwardBadgeUseCase {
    constructor(private readonly idempotency: IdempotentStatementUseCase) {}

    async execute(
        badgeToAward: TBadge,
        originalStatement: TXApiStatement,
        alreadyEarnedBadgeIris: Set<string>,
    ): Promise<TXApiStatement | null> {
        if (alreadyEarnedBadgeIris.has(badgeToAward.iri)) {
            return null;
        }

        const badgeAwardStatement = this.buildBadgeAwardStatement(
            badgeToAward,
            originalStatement,
        );

        const badgeRegistrationResult =
            await this.idempotency.ensureBadge(badgeAwardStatement);

        alreadyEarnedBadgeIris.add(badgeToAward.iri);

        return badgeRegistrationResult.created
            ? badgeRegistrationResult.statement
            : null;
    }

    private buildBadgeAwardStatement(
        badgeToAward: TBadge,
        originalStatement: TXApiStatement,
    ): TXApiStatement {
        return {
            id: deterministicStatementId(
                'earned-badge',
                badgeToAward.projectId,
                originalStatement.actor.mbox,
                badgeToAward.iri,
            ),
            actor: originalStatement.actor,
            verb: {
                id: XAPI_VERBS.EARNED_BADGE,
                display: { 'pt-BR': 'conquistou' },
            },
            object: {
                id: badgeToAward.iri,
                objectType: 'Activity',
                definition: {
                    type: XAPI_ACTIVITY_TYPES.BADGE,
                    name: { 'pt-BR': badgeToAward.name },
                    description: {
                        'pt-BR': badgeToAward.description,
                    },
                },
            },
            context: {
                statement: {
                    objectType: 'StatementRef',
                    id: originalStatement.id,
                },
                contextActivities: {
                    grouping:
                        originalStatement.context?.contextActivities
                            ?.grouping ?? [],
                },
            },
        };
    }
}
