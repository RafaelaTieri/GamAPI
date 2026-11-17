import { BadRequestException, Injectable } from '@nestjs/common';

import { XAPI_EXTENSIONS } from '../../xapi/domain/xapi.constants';
import { StatementGateway } from '../domain/statements.gateway';

@Injectable()
export class GetAccumulatedPointsUseCase {
    constructor(private readonly statementGateway: StatementGateway) {}

    async execute(participantMbox: string): Promise<number> {
        if (!participantMbox) {
            throw new BadRequestException('Informe o e-mail do participante.');
        }

        const pointsStatementResult =
            await this.statementGateway.getPointsByActor(participantMbox);

        return pointsStatementResult.statements.reduce(
            (accumulatedPoints, pointsStatement) => {
                const statementPoints =
                    pointsStatement.result?.extensions?.[
                        XAPI_EXTENSIONS.POINTS
                    ];

                return (
                    accumulatedPoints +
                    (typeof statementPoints === 'number' ? statementPoints : 0)
                );
            },
            0,
        );
    }
}
