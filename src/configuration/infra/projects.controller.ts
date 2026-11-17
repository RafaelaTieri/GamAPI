import { Body, Controller, Param, Post } from '@nestjs/common';

import { AddChallengeToProjectUseCase } from '../application/add-challenge-to-project.use.case';
import { CreateProjectUseCase } from '../application/create-project.use.case';

import type {
    TCreateProject,
    TProject,
} from '../domain/configuration.entities';

@Controller('projects')
export class ProjectsController {
    constructor(
        private readonly createProjectUseCase: CreateProjectUseCase,
        private readonly addChallengeToProjectUseCase: AddChallengeToProjectUseCase,
    ) {}

    @Post()
    async create(@Body() params: TCreateProject): Promise<TProject> {
        return this.createProjectUseCase.execute(params);
    }

    @Post(':projectId/challenges')
    async addChallenge(
        @Param('projectId') projectId: string,
        @Body('challengeId') challengeId: string,
    ): Promise<{ linked: boolean }> {
        await this.addChallengeToProjectUseCase.execute(projectId, challengeId);

        return { linked: true };
    }
}
