import {
    BadRequestException,
    ConflictException,
    Injectable,
} from '@nestjs/common';

import type {
    TChallenge,
    TCreateChallenge,
} from '../../challenges/domain/challenge.entities';

import { ConfigurationGateway } from '../domain/configuration.gateway';

@Injectable()
export class CreateChallengeUseCase {
    constructor(private readonly configurationGateway: ConfigurationGateway) {}

    async execute(challengeInput: TCreateChallenge): Promise<TChallenge> {
        const challengeName = challengeInput?.name?.trim();
        const challengeIri = challengeInput?.iri?.trim();

        if (!challengeName || !challengeIri) {
            throw new BadRequestException('Informe o nome e a IRI do desafio.');
        }

        if (
            !Number.isInteger(challengeInput.points) ||
            challengeInput.points < 0
        ) {
            throw new BadRequestException('Informe uma pontuação válida.');
        }

        const registeredChallenge =
            await this.configurationGateway.findChallengeByIri(challengeIri);

        if (registeredChallenge) {
            throw new ConflictException('Desafio já cadastrado.');
        }

        return this.configurationGateway.createChallenge({
            name: challengeName,
            iri: challengeIri,
            points: challengeInput.points,
        });
    }
}
