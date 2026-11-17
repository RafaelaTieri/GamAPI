import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ChallengesModule } from '../challenges/challenge.module';
import { BadgesModule } from '../badges/badges.module';

import { CreateStatementUseCase } from './application/create-statement.use.case';
import { GeneratePointsStatementUseCase } from './application/generate-points-statement.use.case';
import { GetAccumulatedPointsUseCase } from './application/get-accumulated-points.use.case';
import { GetAllStatementsUseCase } from './application/get-all-statements-by-actor.use.case';
import { GetStatementUseCase } from './application/get-statement-by-id.use.case';
import { ValidateStatementUseCase } from './application/validate-statement.use.case';
import { StatementGateway } from './domain/statements.gateway';
import { StatementsController } from './infra/statements.controller';
import { StatementHttpGateway } from './infra/statements.http.gateway';

@Module({
    imports: [HttpModule, ChallengesModule, BadgesModule],
    controllers: [StatementsController],
    providers: [
        CreateStatementUseCase,
        GetStatementUseCase,
        GetAccumulatedPointsUseCase,
        GetAllStatementsUseCase,
        ValidateStatementUseCase,
        GeneratePointsStatementUseCase,
        {
            provide: StatementGateway,
            useClass: StatementHttpGateway,
        },
    ],
})
export class StatementsModule {}
