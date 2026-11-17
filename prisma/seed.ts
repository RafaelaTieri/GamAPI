import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client';

async function main(): Promise<void> {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error('DATABASE_URL não configurada.');
    }

    const adapter = new PrismaPg({ connectionString });
    const prisma = new PrismaClient({ adapter });

    try {
        const application = await prisma.application.upsert({
            where: {
                iri: 'https://gamapi.dev/applications/gamekins',
            },
            update: {},
            create: {
                name: 'Gamekins',
                iri: 'https://gamapi.dev/applications/gamekins',
            },
        });

        const project = await prisma.project.upsert({
            where: {
                iri: 'https://gamapi.dev/projects/project-a',
            },
            update: {},
            create: {
                name: 'Project A',
                iri: 'https://gamapi.dev/projects/project-a',
                applicationId: application.id,
            },
        });

        const challenge = await prisma.challenge.upsert({
            where: {
                iri: 'https://gamapi.dev/challenges/branch-coverage',
            },
            update: {},
            create: {
                name: 'Branch Coverage Challenge',
                iri: 'https://gamapi.dev/challenges/branch-coverage',
                points: 5,
            },
        });

        await prisma.projectChallenge.upsert({
            where: {
                projectId_challengeId: {
                    projectId: project.id,
                    challengeId: challenge.id,
                },
            },
            update: {},
            create: {
                projectId: project.id,
                challengeId: challenge.id,
            },
        });
    } finally {
        await prisma.$disconnect();
    }
}

void main();
