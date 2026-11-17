import { Module } from '@nestjs/common';

import { AddChallengeToProjectUseCase } from './application/add-challenge-to-project.use.case';
import { CreateApplicationUseCase } from './application/create-application.use.case';
import { CreateChallengeUseCase } from './application/create-challenge.use.case';
import { CreateProjectUseCase } from './application/create-project.use.case';
import { UpdateChallengePointsUseCase } from './application/update-challenge-points.use.case';

import { ConfigurationGateway } from './domain/configuration.gateway';

import { ApplicationsController } from './infra/applications.controller';
import { ChallengesConfigurationController } from './infra/challenges-configuration.controller';
import { ConfigurationPrismaGateway } from './infra/configuration.prisma.gateway';
import { ProjectsController } from './infra/projects.controller';

@Module({
    controllers: [
        ApplicationsController,
        ProjectsController,
        ChallengesConfigurationController,
    ],
    providers: [
        CreateApplicationUseCase,
        CreateProjectUseCase,
        CreateChallengeUseCase,
        AddChallengeToProjectUseCase,
        UpdateChallengePointsUseCase,
        {
            provide: ConfigurationGateway,
            useClass: ConfigurationPrismaGateway,
        },
    ],
    exports: [ConfigurationGateway],
})
export class ConfigurationModule {}
