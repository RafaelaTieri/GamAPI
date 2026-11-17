import { BadRequestException, Injectable } from '@nestjs/common';

import type { TXApiStatement } from '../domain/statements.entities';
import { StatementGateway } from '../domain/statements.gateway';

@Injectable()
export class GetAllStatementsUseCase {
    constructor(private readonly statementGateway: StatementGateway) {}

    async execute(participantMbox: string): Promise<TXApiStatement[]> {
        if (!participantMbox) {
            throw new BadRequestException('Informe o e-mail do participante.');
        }

        const completedStatementsResult =
            await this.statementGateway.getAllStatementsByActor(
                participantMbox,
            );

        return completedStatementsResult.statements;
    }
}
