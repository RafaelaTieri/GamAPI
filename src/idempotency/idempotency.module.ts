import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { IdempotentStatementUseCase } from './application/idempotent-statement.use.case';
import { StatementIdempotencyGateway } from './domain/statement-idempotency.gateway';
import { StatementIdempotencyHttpGateway } from './infra/statement-idempotency.http.gateway';

@Module({
    imports: [HttpModule],
    providers: [
        IdempotentStatementUseCase,
        {
            provide: StatementIdempotencyGateway,
            useClass: StatementIdempotencyHttpGateway,
        },
    ],
    exports: [IdempotentStatementUseCase],
})
export class IdempotencyModule {}
