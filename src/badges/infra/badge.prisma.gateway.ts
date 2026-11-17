import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import type {
    TBadge,
    TBadgeProject,
    TBadgeRule,
    TCreateBadgeData,
    TCreateBadgeRuleData,
} from '../domain/badge.entities';
import { BadgeGateway } from '../domain/badge.gateway';

import { mapBadge } from './badge.prisma.mapper';

const badgeInclude = {
    rules: {
        include: {
            challenge: {
                select: { iri: true },
            },
        },
    },
} as const;

const projectSelect = {
    id: true,
    name: true,
    iri: true,
    active: true,
    application: {
        select: {
            iri: true,
            active: true,
        },
    },
} as const;

type TStoredProject = {
    id: string;
    name: string;
    iri: string;
    active: boolean;
    application: {
        iri: string;
        active: boolean;
    };
};

@Injectable()
export class BadgePrismaGateway implements BadgeGateway {
    constructor(private readonly prismaService: PrismaService) {}

    async findProjectById(id: string): Promise<TBadgeProject | null> {
        const project = await this.prismaService.project.findUnique({
            where: { id },
            select: projectSelect,
        });

        return project ? this.mapProject(project) : null;
    }

    async findProjectByIri(iri: string): Promise<TBadgeProject | null> {
        const project = await this.prismaService.project.findUnique({
            where: { iri },
            select: projectSelect,
        });

        return project ? this.mapProject(project) : null;
    }

    async findById(id: string): Promise<TBadge | null> {
        const badge = await this.prismaService.badge.findUnique({
            where: { id },
            include: badgeInclude,
        });

        return badge ? mapBadge(badge) : null;
    }

    async findByIri(iri: string): Promise<TBadge | null> {
        const badge = await this.prismaService.badge.findUnique({
            where: { iri },
            include: badgeInclude,
        });

        return badge ? mapBadge(badge) : null;
    }

    async findActiveByProjectId(projectId: string): Promise<TBadge[]> {
        const badges = await this.prismaService.badge.findMany({
            where: { projectId, active: true },
            include: badgeInclude,
        });

        return badges.map(mapBadge);
    }

    async findChallengeById(
        id: string,
    ): Promise<{ id: string; active: boolean } | null> {
        return this.prismaService.challenge.findUnique({
            where: { id },
            select: { id: true, active: true },
        });
    }

    async isChallengeLinkedToProject(
        projectId: string,
        challengeId: string,
    ): Promise<boolean> {
        const association =
            await this.prismaService.projectChallenge.findUnique({
                where: {
                    projectId_challengeId: {
                        projectId,
                        challengeId,
                    },
                },
            });

        return association !== null;
    }

    async createBadge(params: TCreateBadgeData): Promise<TBadge> {
        const badge = await this.prismaService.badge.create({
            data: params,
            include: badgeInclude,
        });

        return mapBadge(badge);
    }

    async createRule(params: TCreateBadgeRuleData): Promise<TBadgeRule> {
        const rule = await this.prismaService.badgeRule.create({
            data: params,
            include: {
                challenge: {
                    select: { iri: true },
                },
            },
        });

        return {
            id: rule.id,
            badgeId: rule.badgeId,
            type: rule.type,
            requiredPoints: rule.requiredPoints,
            challengeId: rule.challengeId,
            challengeIri: rule.challenge?.iri ?? null,
        };
    }

    private mapProject(project: TStoredProject): TBadgeProject {
        return {
            id: project.id,
            name: project.name,
            iri: project.iri,
            active: project.active,
            applicationIri: project.application.iri,
            applicationActive: project.application.active,
        };
    }
}
