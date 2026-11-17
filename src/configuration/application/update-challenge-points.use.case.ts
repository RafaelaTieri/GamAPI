import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import type { TChallenge } from '../../challenges/domain/challenge.entities';
import { ConfigurationGateway } from '../domain/configuration.gateway';

@Injectable()
export class UpdateChallengePointsUseCase {
    constructor(private readonly configurationGateway: ConfigurationGateway) {}

    async execute(challengeId: string, newPoints: number): Promise<TChallenge> {
        if (!challengeId) {
            throw new BadRequestException(
                'Informe o identificador do desafio.',
            );
        }

        if (!Number.isInteger(newPoints) || newPoints < 0) {
            throw new BadRequestException('Informe uma pontuação válida.');
        }

        const challengeToUpdate =
            await this.configurationGateway.findChallengeById(challengeId);

        if (!challengeToUpdate?.active) {
            throw new NotFoundException('Desafio não encontrado ou inativo.');
        }

        return this.configurationGateway.updateChallengePoints(
            challengeId,
            newPoints,
        );
    }
}
