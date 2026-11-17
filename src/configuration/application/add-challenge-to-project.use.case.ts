import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { ConfigurationGateway } from '../domain/configuration.gateway';

@Injectable()
export class AddChallengeToProjectUseCase {
    constructor(private readonly configurationGateway: ConfigurationGateway) {}

    async execute(projectId: string, challengeId: string): Promise<void> {
        if (!projectId || !challengeId) {
            throw new BadRequestException('Informe o projeto e o desafio.');
        }

        const targetProject =
            await this.configurationGateway.findProjectById(projectId);

        if (!targetProject?.active) {
            throw new NotFoundException('Projeto não encontrado ou inativo.');
        }

        const challengeToAssociate =
            await this.configurationGateway.findChallengeById(challengeId);

        if (!challengeToAssociate?.active) {
            throw new NotFoundException('Desafio não encontrado ou inativo.');
        }

        await this.configurationGateway.addChallengeToProject(
            projectId,
            challengeId,
        );
    }
}
