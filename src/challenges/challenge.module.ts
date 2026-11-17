import { Module } from '@nestjs/common';

import { GetChallengePointsUseCase } from './application/get-challenge-points.use.case';
import { ChallengeGateway } from './domain/challenge.gateway';
import { ChallengePrismaGateway } from './infra/challenge.prisma.gateway';
import { ChallengesController } from './infra/challenge.controller';

@Module({
    controllers: [ChallengesController],
    providers: [
        GetChallengePointsUseCase,
        {
            provide: ChallengeGateway,
            useClass: ChallengePrismaGateway,
        },
    ],
    exports: [GetChallengePointsUseCase],
})
export class ChallengesModule {}
