import { Injectable } from '@nestjs/common';

import { deterministicStatementId } from '../../common/utils/deterministic-statement-id';
import {
    XAPI_ACTIVITY_TYPES,
    XAPI_EXTENSIONS,
    XAPI_VERBS,
} from '../../xapi/domain/xapi.constants';
import type { TXApiStatement } from '../domain/statements.entities';

@Injectable()
export class GeneratePointsStatementUseCase {
    execute(
        originalStatement: TXApiStatement,
        awardedPoints: number,
    ): TXApiStatement {
        return {
            id: deterministicStatementId('earned-points', originalStatement.id),
            actor: originalStatement.actor,
            verb: {
                id: XAPI_VERBS.EARNED_POINTS,
                display: { 'en-US': 'earned points' },
            },
            object: {
                id: 'https://gamapi.dev/points',
                objectType: 'Activity',
                definition: {
                    type: XAPI_ACTIVITY_TYPES.POINTS,
                    name: { 'en-US': 'Points' },
                },
            },
            result: {
                extensions: {
                    [XAPI_EXTENSIONS.POINTS]: awardedPoints,
                },
            },
            context: {
                statement: {
                    objectType: 'StatementRef',
                    id: originalStatement.id,
                },
            },
        };
    }
}
