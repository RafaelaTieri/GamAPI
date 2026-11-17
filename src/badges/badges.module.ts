import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { IdempotencyModule } from '../idempotency/idempotency.module';
import { CreateBadgeUseCase } from './application/create-badge.use.case';
import { CreateBadgeRuleUseCase } from './application/create-badge-rule.use.case';
import { EvaluateBadgeRulesUseCase } from './application/evaluate-badge-rules.use.case';
import { ProcessEarnedBadgesUseCase } from './application/process-earned-badges.use.case';
import { AwardBadgeUseCase } from './application/award-badge.use.case';
import { GetEarnedBadgesUseCase } from './application/get-earned-badges.use.case';
import { BadgeGateway } from './domain/badge.gateway';
import { BadgeStatementGateway } from './domain/badge-statement.gateway';
import { BadgePrismaGateway } from './infra/badge.prisma.gateway';
import { BadgeStatementHttpGateway } from './infra/badge-statement.http.gateway';
import { BadgesController } from './infra/badges.controller';

@Module({
    imports: [HttpModule, IdempotencyModule],
    controllers: [BadgesController],
    providers: [
        CreateBadgeUseCase,
        CreateBadgeRuleUseCase,
        EvaluateBadgeRulesUseCase,
        ProcessEarnedBadgesUseCase,
        AwardBadgeUseCase,
        GetEarnedBadgesUseCase,
        {
            provide: BadgeGateway,
            useClass: BadgePrismaGateway,
        },
        {
            provide: BadgeStatementGateway,
            useClass: BadgeStatementHttpGateway,
        },
    ],
    exports: [ProcessEarnedBadgesUseCase, IdempotencyModule],
})
export class BadgesModule {}
