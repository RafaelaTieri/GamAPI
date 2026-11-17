import { Injectable } from '@nestjs/common';

import type { TXApiStatement } from '../domain/statements.entities';
import { StatementGateway } from '../domain/statements.gateway';

@Injectable()
export class GetStatementUseCase {
    constructor(private readonly statementGateway: StatementGateway) {}

    async execute(statementId: string): Promise<TXApiStatement> {
        return this.statementGateway.getById(statementId);
    }
}
