import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import type { TChallenge } from '../domain/challenge.entities';
import {
    ChallengeGateway,
    TGetChallengeByContext,
} from '../domain/challenge.gateway';

@Injectable()
export class ChallengePrismaGateway implements ChallengeGateway {
    constructor(private readonly prismaService: PrismaService) {}

    async getByContext(
        params: TGetChallengeByContext,
    ): Promise<TChallenge | null> {
        return this.prismaService.challenge.findFirst({
            where: {
                iri: params.challengeIri,
                active: true,
                projects: {
                    some: {
                        project: {
                            iri: params.projectIri,
                            active: true,
                            application: {
                                iri: params.applicationIri,
                                active: true,
                            },
                        },
                    },
                },
            },
            select: {
                id: true,
                name: true,
                iri: true,
                points: true,
                active: true,
            },
        });
    }
}
