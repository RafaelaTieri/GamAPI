import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import type {
    TChallenge,
    TCreateChallenge,
} from '../../challenges/domain/challenge.entities';

import type {
    TApplication,
    TCreateApplication,
    TCreateProject,
    TProject,
} from '../domain/configuration.entities';

import { ConfigurationGateway } from '../domain/configuration.gateway';

@Injectable()
export class ConfigurationPrismaGateway implements ConfigurationGateway {
    constructor(private readonly prismaService: PrismaService) {}

    async findApplicationById(id: string): Promise<TApplication | null> {
        return this.prismaService.application.findUnique({ where: { id } });
    }

    async findApplicationByIri(iri: string): Promise<TApplication | null> {
        return this.prismaService.application.findUnique({ where: { iri } });
    }

    async findProjectById(id: string): Promise<TProject | null> {
        return this.prismaService.project.findUnique({ where: { id } });
    }

    async findProjectByIri(iri: string): Promise<TProject | null> {
        return this.prismaService.project.findUnique({ where: { iri } });
    }

    async findChallengeById(id: string): Promise<TChallenge | null> {
        return this.prismaService.challenge.findUnique({ where: { id } });
    }

    async findChallengeByIri(iri: string): Promise<TChallenge | null> {
        return this.prismaService.challenge.findUnique({ where: { iri } });
    }

    async createApplication(params: TCreateApplication): Promise<TApplication> {
        return this.prismaService.application.create({ data: params });
    }

    async createProject(params: TCreateProject): Promise<TProject> {
        return this.prismaService.project.create({ data: params });
    }

    async createChallenge(params: TCreateChallenge): Promise<TChallenge> {
        return this.prismaService.challenge.create({ data: params });
    }

    async addChallengeToProject(
        projectId: string,
        challengeId: string,
    ): Promise<void> {
        await this.prismaService.projectChallenge.upsert({
            where: {
                projectId_challengeId: {
                    projectId,
                    challengeId,
                },
            },
            create: {
                projectId,
                challengeId,
            },
            update: {},
        });
    }

    async updateChallengePoints(
        id: string,
        points: number,
    ): Promise<TChallenge> {
        return this.prismaService.challenge.update({
            where: { id },
            data: { points },
        });
    }
}
