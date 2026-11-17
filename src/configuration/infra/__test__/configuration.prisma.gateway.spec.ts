import type { PrismaService } from '../../../database/prisma.service';
import type {
    TChallenge,
    TCreateChallenge,
} from '../../../challenges/domain/challenge.entities';
import type {
    TApplication,
    TCreateApplication,
    TCreateProject,
    TProject,
} from '../../domain/configuration.entities';
import { ConfigurationPrismaGateway } from '../configuration.prisma.gateway';

jest.mock('../../../database/prisma.service', () => ({
    PrismaService: class PrismaService {},
}));

describe('ConfigurationPrismaGateway', () => {
    let gateway: ConfigurationPrismaGateway;

    let prisma: {
        application: {
            findUnique: jest.Mock;
            create: jest.Mock;
        };
        project: {
            findUnique: jest.Mock;
            create: jest.Mock;
        };
        challenge: {
            findUnique: jest.Mock;
            create: jest.Mock;
            update: jest.Mock;
        };
        projectChallenge: {
            upsert: jest.Mock;
        };
    };

    const application: TApplication = {
        id: 'application-1',
        name: 'Aplicação Educacional',
        iri: 'https://gamapi.dev/applications/educacional',
        active: true,
    };

    const project: TProject = {
        id: 'project-1',
        name: 'Projeto UX',
        iri: 'https://gamapi.dev/projects/ux',
        applicationId: application.id,
        active: true,
    };

    const challenge: TChallenge = {
        id: 'challenge-1',
        name: 'Desafio de UX',
        iri: 'https://gamapi.dev/challenges/ux',
        points: 40,
        active: true,
    };

    beforeEach(() => {
        prisma = {
            application: {
                findUnique: jest.fn(),
                create: jest.fn(),
            },
            project: {
                findUnique: jest.fn(),
                create: jest.fn(),
            },
            challenge: {
                findUnique: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
            projectChallenge: {
                upsert: jest.fn(),
            },
        };

        gateway = new ConfigurationPrismaGateway(
            prisma as unknown as PrismaService,
        );
    });

    describe('findApplicationById', () => {
        it('deve consultar a aplicação pelo ID', async () => {
            prisma.application.findUnique.mockResolvedValue(application);

            const result = await gateway.findApplicationById(application.id);

            expect(result).toEqual(application);
            expect(prisma.application.findUnique).toHaveBeenCalledWith({
                where: { id: application.id },
            });
        });

        it('deve retornar null para aplicação inexistente', async () => {
            prisma.application.findUnique.mockResolvedValue(null);

            const result = await gateway.findApplicationById('inexistente');

            expect(result).toBeNull();
        });
    });

    describe('findApplicationByIri', () => {
        it('deve consultar a aplicação pela IRI', async () => {
            prisma.application.findUnique.mockResolvedValue(application);

            const result = await gateway.findApplicationByIri(application.iri);

            expect(result).toEqual(application);
            expect(prisma.application.findUnique).toHaveBeenCalledWith({
                where: { iri: application.iri },
            });
        });

        it('deve retornar null para IRI inexistente', async () => {
            prisma.application.findUnique.mockResolvedValue(null);

            const result = await gateway.findApplicationByIri(
                'https://gamapi.dev/applications/inexistente',
            );

            expect(result).toBeNull();
        });
    });

    describe('findProjectById', () => {
        it('deve consultar o projeto pelo ID', async () => {
            prisma.project.findUnique.mockResolvedValue(project);

            const result = await gateway.findProjectById(project.id);

            expect(result).toEqual(project);
            expect(prisma.project.findUnique).toHaveBeenCalledWith({
                where: { id: project.id },
            });
        });

        it('deve retornar null para projeto inexistente', async () => {
            prisma.project.findUnique.mockResolvedValue(null);

            const result = await gateway.findProjectById('inexistente');

            expect(result).toBeNull();
        });
    });

    describe('findProjectByIri', () => {
        it('deve consultar o projeto pela IRI', async () => {
            prisma.project.findUnique.mockResolvedValue(project);

            const result = await gateway.findProjectByIri(project.iri);

            expect(result).toEqual(project);
            expect(prisma.project.findUnique).toHaveBeenCalledWith({
                where: { iri: project.iri },
            });
        });

        it('deve retornar null para IRI inexistente', async () => {
            prisma.project.findUnique.mockResolvedValue(null);

            const result = await gateway.findProjectByIri(
                'https://gamapi.dev/projects/inexistente',
            );

            expect(result).toBeNull();
        });
    });

    describe('findChallengeById', () => {
        it('deve consultar o desafio pelo ID', async () => {
            prisma.challenge.findUnique.mockResolvedValue(challenge);

            const result = await gateway.findChallengeById(challenge.id);

            expect(result).toEqual(challenge);
            expect(prisma.challenge.findUnique).toHaveBeenCalledWith({
                where: { id: challenge.id },
            });
        });

        it('deve retornar null para desafio inexistente', async () => {
            prisma.challenge.findUnique.mockResolvedValue(null);

            const result = await gateway.findChallengeById('inexistente');

            expect(result).toBeNull();
        });
    });

    describe('findChallengeByIri', () => {
        it('deve consultar o desafio pela IRI', async () => {
            prisma.challenge.findUnique.mockResolvedValue(challenge);

            const result = await gateway.findChallengeByIri(challenge.iri);

            expect(result).toEqual(challenge);
            expect(prisma.challenge.findUnique).toHaveBeenCalledWith({
                where: { iri: challenge.iri },
            });
        });

        it('deve retornar null para IRI inexistente', async () => {
            prisma.challenge.findUnique.mockResolvedValue(null);

            const result = await gateway.findChallengeByIri(
                'https://gamapi.dev/challenges/inexistente',
            );

            expect(result).toBeNull();
        });
    });

    describe('createApplication', () => {
        it('deve criar uma aplicação com os dados recebidos', async () => {
            const input: TCreateApplication = {
                name: application.name,
                iri: application.iri,
            };

            prisma.application.create.mockResolvedValue(application);

            const result = await gateway.createApplication(input);

            expect(result).toEqual(application);
            expect(prisma.application.create).toHaveBeenCalledTimes(1);
            expect(prisma.application.create).toHaveBeenCalledWith({
                data: input,
            });
        });

        it('deve propagar falhas ao criar aplicação', async () => {
            const error = new Error('Falha ao criar aplicação.');

            prisma.application.create.mockRejectedValue(error);

            await expect(
                gateway.createApplication({
                    name: application.name,
                    iri: application.iri,
                }),
            ).rejects.toBe(error);
        });
    });

    describe('createProject', () => {
        it('deve criar um projeto associado à aplicação', async () => {
            const input: TCreateProject = {
                name: project.name,
                iri: project.iri,
                applicationId: application.id,
            };

            prisma.project.create.mockResolvedValue(project);

            const result = await gateway.createProject(input);

            expect(result).toEqual(project);
            expect(prisma.project.create).toHaveBeenCalledTimes(1);
            expect(prisma.project.create).toHaveBeenCalledWith({
                data: input,
            });
        });

        it('deve propagar falhas ao criar projeto', async () => {
            const error = new Error('Falha ao criar projeto.');

            prisma.project.create.mockRejectedValue(error);

            await expect(
                gateway.createProject({
                    name: project.name,
                    iri: project.iri,
                    applicationId: application.id,
                }),
            ).rejects.toBe(error);
        });
    });

    describe('createChallenge', () => {
        it('deve criar um desafio com os dados recebidos', async () => {
            const input: TCreateChallenge = {
                name: challenge.name,
                iri: challenge.iri,
                points: challenge.points,
            };

            prisma.challenge.create.mockResolvedValue(challenge);

            const result = await gateway.createChallenge(input);

            expect(result).toEqual(challenge);
            expect(prisma.challenge.create).toHaveBeenCalledTimes(1);
            expect(prisma.challenge.create).toHaveBeenCalledWith({
                data: input,
            });
        });

        it('deve permitir criar um desafio com zero pontos', async () => {
            const input: TCreateChallenge = {
                name: challenge.name,
                iri: challenge.iri,
                points: 0,
            };

            prisma.challenge.create.mockResolvedValue({
                ...challenge,
                points: 0,
            });

            const result = await gateway.createChallenge(input);

            expect(result.points).toBe(0);
            expect(prisma.challenge.create).toHaveBeenCalledWith({
                data: input,
            });
        });

        it('deve propagar falhas ao criar desafio', async () => {
            const error = new Error('Falha ao criar desafio.');

            prisma.challenge.create.mockRejectedValue(error);

            await expect(
                gateway.createChallenge({
                    name: challenge.name,
                    iri: challenge.iri,
                    points: challenge.points,
                }),
            ).rejects.toBe(error);
        });
    });

    describe('addChallengeToProject', () => {
        it('deve associar um desafio ao projeto utilizando upsert', async () => {
            prisma.projectChallenge.upsert.mockResolvedValue({
                projectId: project.id,
                challengeId: challenge.id,
            });

            const result = await gateway.addChallengeToProject(
                project.id,
                challenge.id,
            );

            expect(result).toBeUndefined();
            expect(prisma.projectChallenge.upsert).toHaveBeenCalledTimes(1);

            expect(prisma.projectChallenge.upsert).toHaveBeenCalledWith({
                where: {
                    projectId_challengeId: {
                        projectId: project.id,
                        challengeId: challenge.id,
                    },
                },
                create: {
                    projectId: project.id,
                    challengeId: challenge.id,
                },
                update: {},
            });
        });

        it('deve permitir repetir a associação com os mesmos identificadores', async () => {
            prisma.projectChallenge.upsert.mockResolvedValue({
                projectId: project.id,
                challengeId: challenge.id,
            });

            await gateway.addChallengeToProject(project.id, challenge.id);

            await gateway.addChallengeToProject(project.id, challenge.id);

            expect(prisma.projectChallenge.upsert).toHaveBeenCalledTimes(2);

            expect(prisma.projectChallenge.upsert).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({
                    update: {},
                }),
            );

            expect(prisma.projectChallenge.upsert).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    update: {},
                }),
            );
        });

        it('deve utilizar os identificadores recebidos', async () => {
            await gateway.addChallengeToProject('project-2', 'challenge-2');

            expect(prisma.projectChallenge.upsert).toHaveBeenCalledWith({
                where: {
                    projectId_challengeId: {
                        projectId: 'project-2',
                        challengeId: 'challenge-2',
                    },
                },
                create: {
                    projectId: 'project-2',
                    challengeId: 'challenge-2',
                },
                update: {},
            });
        });

        it('deve propagar falhas durante a associação', async () => {
            const error = new Error('Falha ao associar desafio.');

            prisma.projectChallenge.upsert.mockRejectedValue(error);

            await expect(
                gateway.addChallengeToProject(project.id, challenge.id),
            ).rejects.toBe(error);
        });
    });

    describe('updateChallengePoints', () => {
        it('deve atualizar a pontuação do desafio', async () => {
            const updatedChallenge: TChallenge = {
                ...challenge,
                points: 100,
            };

            prisma.challenge.update.mockResolvedValue(updatedChallenge);

            const result = await gateway.updateChallengePoints(
                challenge.id,
                100,
            );

            expect(result).toEqual(updatedChallenge);
            expect(prisma.challenge.update).toHaveBeenCalledTimes(1);

            expect(prisma.challenge.update).toHaveBeenCalledWith({
                where: { id: challenge.id },
                data: { points: 100 },
            });
        });

        it('deve permitir atualizar a pontuação para zero', async () => {
            prisma.challenge.update.mockResolvedValue({
                ...challenge,
                points: 0,
            });

            const result = await gateway.updateChallengePoints(challenge.id, 0);

            expect(result.points).toBe(0);

            expect(prisma.challenge.update).toHaveBeenCalledWith({
                where: { id: challenge.id },
                data: { points: 0 },
            });
        });

        it('deve utilizar o ID e a pontuação recebidos', async () => {
            prisma.challenge.update.mockResolvedValue({
                ...challenge,
                id: 'challenge-2',
                points: 150,
            });

            await gateway.updateChallengePoints('challenge-2', 150);

            expect(prisma.challenge.update).toHaveBeenCalledWith({
                where: { id: 'challenge-2' },
                data: { points: 150 },
            });
        });

        it('deve propagar falhas durante a atualização', async () => {
            const error = new Error('Falha ao atualizar pontuação.');

            prisma.challenge.update.mockRejectedValue(error);

            await expect(
                gateway.updateChallengePoints(challenge.id, 100),
            ).rejects.toBe(error);
        });
    });
});
