import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { CreateStatementUseCase } from '../application/create-statement.use.case';
import { GetAccumulatedPointsUseCase } from '../application/get-accumulated-points.use.case';
import { GetAllStatementsUseCase } from '../application/get-all-statements-by-actor.use.case';
import { GetStatementUseCase } from '../application/get-statement-by-id.use.case';
import type { TXApiStatement } from '../domain/statements.entities';

@Controller('statements')
export class StatementsController {
    constructor(
        private readonly createStatementUseCase: CreateStatementUseCase,
        private readonly getStatementUseCase: GetStatementUseCase,
        private readonly getAccumulatedPointsUseCase: GetAccumulatedPointsUseCase,
        private readonly getAllStatementsUseCase: GetAllStatementsUseCase,
    ) {}

    @Post()
    async create(
        @Body() incomingStatement: TXApiStatement,
    ): Promise<TXApiStatement> {
        return this.createStatementUseCase.execute(incomingStatement);
    }

    @Get('points/accumulated')
    async getAccumulatedPoints(
        @Query('mbox') participantMbox: string,
    ): Promise<{ points: number }> {
        const accumulatedPoints =
            await this.getAccumulatedPointsUseCase.execute(participantMbox);

        return { points: accumulatedPoints };
    }

    @Get('all')
    async getAllStatements(
        @Query('mbox') participantMbox: string,
    ): Promise<{ statements: TXApiStatement[] }> {
        const completedStatements =
            await this.getAllStatementsUseCase.execute(participantMbox);

        return { statements: completedStatements };
    }

    @Get(':id')
    async getById(@Param('id') statementId: string): Promise<TXApiStatement> {
        return this.getStatementUseCase.execute(statementId);
    }
}
