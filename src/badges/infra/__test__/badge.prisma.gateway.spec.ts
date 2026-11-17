import type { PrismaService } from '../../../database/prisma.service';

import type {
    TBadge,
    TBadgeProject,
    TCreateBadgeData,
    TCreateBadgeRuleData,
} from '../../domain/badge.entities';
import { BadgePrismaGateway } from '../badge.prisma.gateway';

jest.mock('../../../database/prisma.service', () => ({
    PrismaService: class PrismaService {},
}));

describe('BadgePrismaGateway', () => {
    const PROJECT_ID = 'project-1';
    const PROJECT_IRI = 'https://gamapi.dev/projects/ux';
    const APPLICATION_IRI = 'https://gamapi.dev/applications/teste';
    const BADGE_ID = 'badge-1';
    const BADGE_IRI = 'https://gamapi.dev/badges/ux-master';
    const CHALLENGE_ID = 'challenge-1';
    const CHALLENGE_IRI = 'https://gamapi.dev/challenges/ux';

    const storedProject = {
        id: PROJECT_ID,
        name: 'Projeto UX',
        iri: PROJECT_IRI,
        active: true,
        application: {
            iri: APPLICATION_IRI,
            active: true,
        },
    };

    const expectedProject: TBadgeProject = {
        id: PROJECT_ID,
        name: 'Projeto UX',
        iri: PROJECT_IRI,
        active: true,
        applicationIri: APPLICATION_IRI,
        applicationActive: true,
    };

    const createStoredBadge = (id = BADGE_ID) => ({
        id,
        name: 'UX Master',
        description: 'Concluiu os requisitos de UX.',
        iri: BADGE_IRI,
        imageUrl: null,
        projectId: PROJECT_ID,
        ruleOperator: 'ALL',
        active: true,
        rules: [
            {
                id: 'rule-1',
                badgeId: id,
                type: 'CHALLENGE_COMPLETED',
                requiredPoints: null,
                challengeId: CHALLENGE_ID,
                challenge: {
                    iri: CHALLENGE_IRI,
                },
            },
        ],
    });

    const expectedBadge: TBadge = {
        id: BADGE_ID,
        name: 'UX Master',
        description: 'Concluiu os requisitos de UX.',
        iri: BADGE_IRI,
        imageUrl: null,
        projectId: PROJECT_ID,
        ruleOperator: 'ALL',
        active: true,
        rules: [
            {
                id: 'rule-1',
                badgeId: BADGE_ID,
                type: 'CHALLENGE_COMPLETED',
                requiredPoints: null,
                challengeId: CHALLENGE_ID,
                challengeIri: CHALLENGE_IRI,
            },
        ],
    };

    const createBadgeInput: TCreateBadgeData = {
        name: 'Nova Insígnia',
        description: 'Descrição da nova insígnia.',
        iri: 'https://gamapi.dev/badges/nova',
        imageUrl: null,
        projectId: PROJECT_ID,
        ruleOperator: 'ANY',
    };

    const createRuleInput: TCreateBadgeRuleData = {
        badgeId: BADGE_ID,
        type: 'CHALLENGE_COMPLETED',
        requiredPoints: null,
        challengeId: CHALLENGE_ID,
    };

    let gateway: BadgePrismaGateway;

    let prisma: {
        project: {
            findUnique: jest.Mock;
        };
        badge: {
            findUnique: jest.Mock;
            findMany: jest.Mock;
            create: jest.Mock;
        };
        challenge: {
            findUnique: jest.Mock;
        };
        projectChallenge: {
            findUnique: jest.Mock;
        };
        badgeRule: {
            create: jest.Mock;
        };
    };

    beforeEach(() => {
        prisma = {
            project: {
                findUnique: jest.fn(),
            },
            badge: {
                findUnique: jest.fn(),
                findMany: jest.fn(),
                create: jest.fn(),
            },
            challenge: {
                findUnique: jest.fn(),
            },
            projectChallenge: {
                findUnique: jest.fn(),
            },
            badgeRule: {
                create: jest.fn(),
            },
        };

        gateway = new BadgePrismaGateway(prisma as unknown as PrismaService);
    });

    describe('findProjectById', () => {
        it('deve consultar e mapear um projeto pelo ID', async () => {
            prisma.project.findUnique.mockResolvedValue(storedProject);

            const result = await gateway.findProjectById(PROJECT_ID);

            expect(result).toEqual(expectedProject);

            expect(prisma.project.findUnique).toHaveBeenCalledWith({
                where: {
                    id: PROJECT_ID,
                },
                select: {
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
                },
            });
        });

        it('deve retornar null quando o projeto não existe', async () => {
            prisma.project.findUnique.mockResolvedValue(null);

            const result = await gateway.findProjectById('project-inexistente');

            expect(result).toBeNull();
        });

        it('deve preservar o estado inativo do projeto e da aplicação', async () => {
            prisma.project.findUnique.mockResolvedValue({
                ...storedProject,
                active: false,
                application: {
                    ...storedProject.application,
                    active: false,
                },
            });

            const result = await gateway.findProjectById(PROJECT_ID);

            expect(result).toEqual({
                ...expectedProject,
                active: false,
                applicationActive: false,
            });
        });
    });

    describe('findProjectByIri', () => {
        it('deve consultar e mapear um projeto pela IRI', async () => {
            prisma.project.findUnique.mockResolvedValue(storedProject);

            const result = await gateway.findProjectByIri(PROJECT_IRI);

            expect(result).toEqual(expectedProject);

            expect(prisma.project.findUnique).toHaveBeenCalledWith({
                where: {
                    iri: PROJECT_IRI,
                },
                select: {
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
                },
            });
        });

        it('deve retornar null quando a IRI não existe', async () => {
            prisma.project.findUnique.mockResolvedValue(null);

            const result = await gateway.findProjectByIri(
                'https://gamapi.dev/projects/inexistente',
            );

            expect(result).toBeNull();
        });
    });

    describe('findById', () => {
        it('deve consultar e mapear uma insígnia pelo ID', async () => {
            prisma.badge.findUnique.mockResolvedValue(createStoredBadge());

            const result = await gateway.findById(BADGE_ID);

            expect(result).toEqual(expectedBadge);

            expect(prisma.badge.findUnique).toHaveBeenCalledWith({
                where: {
                    id: BADGE_ID,
                },
                include: {
                    rules: {
                        include: {
                            challenge: {
                                select: {
                                    iri: true,
                                },
                            },
                        },
                    },
                },
            });
        });

        it('deve retornar null quando a insígnia não existe', async () => {
            prisma.badge.findUnique.mockResolvedValue(null);

            const result = await gateway.findById('badge-inexistente');

            expect(result).toBeNull();
        });
    });

    describe('findByIri', () => {
        it('deve consultar e mapear uma insígnia pela IRI', async () => {
            prisma.badge.findUnique.mockResolvedValue(createStoredBadge());

            const result = await gateway.findByIri(BADGE_IRI);

            expect(result).toEqual(expectedBadge);

            expect(prisma.badge.findUnique).toHaveBeenCalledWith({
                where: {
                    iri: BADGE_IRI,
                },
                include: {
                    rules: {
                        include: {
                            challenge: {
                                select: {
                                    iri: true,
                                },
                            },
                        },
                    },
                },
            });
        });

        it('deve retornar null quando a IRI não existe', async () => {
            prisma.badge.findUnique.mockResolvedValue(null);

            const result = await gateway.findByIri(
                'https://gamapi.dev/badges/inexistente',
            );

            expect(result).toBeNull();
        });

        it('deve mapear uma insígnia sem regras', async () => {
            prisma.badge.findUnique.mockResolvedValue({
                ...createStoredBadge(),
                rules: [],
            });

            const result = await gateway.findByIri(BADGE_IRI);

            expect(result?.rules).toEqual([]);
        });
    });

    describe('findActiveByProjectId', () => {
        it('deve retornar as insígnias ativas do projeto', async () => {
            const secondBadge = {
                ...createStoredBadge('badge-2'),
                iri: 'https://gamapi.dev/badges/advanced-ux',
                rules: [],
            };

            prisma.badge.findMany.mockResolvedValue([
                createStoredBadge(),
                secondBadge,
            ]);

            const result = await gateway.findActiveByProjectId(PROJECT_ID);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(expectedBadge);
            expect(result[1].id).toBe('badge-2');
            expect(result[1].rules).toEqual([]);

            expect(prisma.badge.findMany).toHaveBeenCalledWith({
                where: {
                    projectId: PROJECT_ID,
                    active: true,
                },
                include: {
                    rules: {
                        include: {
                            challenge: {
                                select: {
                                    iri: true,
                                },
                            },
                        },
                    },
                },
            });
        });

        it('deve retornar lista vazia quando não existem insígnias ativas', async () => {
            prisma.badge.findMany.mockResolvedValue([]);

            const result = await gateway.findActiveByProjectId(PROJECT_ID);

            expect(result).toEqual([]);
        });
    });

    describe('findChallengeById', () => {
        it('deve retornar um desafio existente', async () => {
            const challenge = {
                id: CHALLENGE_ID,
                active: true,
            };

            prisma.challenge.findUnique.mockResolvedValue(challenge);

            const result = await gateway.findChallengeById(CHALLENGE_ID);

            expect(result).toEqual(challenge);

            expect(prisma.challenge.findUnique).toHaveBeenCalledWith({
                where: {
                    id: CHALLENGE_ID,
                },
                select: {
                    id: true,
                    active: true,
                },
            });
        });

        it('deve retornar um desafio inativo', async () => {
            prisma.challenge.findUnique.mockResolvedValue({
                id: CHALLENGE_ID,
                active: false,
            });

            const result = await gateway.findChallengeById(CHALLENGE_ID);

            expect(result).toEqual({
                id: CHALLENGE_ID,
                active: false,
            });
        });

        it('deve retornar null quando o desafio não existe', async () => {
            prisma.challenge.findUnique.mockResolvedValue(null);

            const result = await gateway.findChallengeById(
                'challenge-inexistente',
            );

            expect(result).toBeNull();
        });
    });

    describe('isChallengeLinkedToProject', () => {
        it('deve retornar true quando existe associação', async () => {
            prisma.projectChallenge.findUnique.mockResolvedValue({
                projectId: PROJECT_ID,
                challengeId: CHALLENGE_ID,
            });

            const result = await gateway.isChallengeLinkedToProject(
                PROJECT_ID,
                CHALLENGE_ID,
            );

            expect(result).toBe(true);

            expect(prisma.projectChallenge.findUnique).toHaveBeenCalledWith({
                where: {
                    projectId_challengeId: {
                        projectId: PROJECT_ID,
                        challengeId: CHALLENGE_ID,
                    },
                },
            });
        });

        it('deve retornar false quando a associação não existe', async () => {
            prisma.projectChallenge.findUnique.mockResolvedValue(null);

            const result = await gateway.isChallengeLinkedToProject(
                PROJECT_ID,
                CHALLENGE_ID,
            );

            expect(result).toBe(false);
        });
    });

    describe('createBadge', () => {
        it('deve criar e mapear uma insígnia', async () => {
            const storedCreatedBadge = {
                ...createStoredBadge('badge-new'),
                ...createBadgeInput,
                rules: [],
            };

            prisma.badge.create.mockResolvedValue(storedCreatedBadge);

            const result = await gateway.createBadge(createBadgeInput);

            expect(result).toEqual({
                id: 'badge-new',
                ...createBadgeInput,
                active: true,
                rules: [],
            });

            expect(prisma.badge.create).toHaveBeenCalledWith({
                data: createBadgeInput,
                include: {
                    rules: {
                        include: {
                            challenge: {
                                select: {
                                    iri: true,
                                },
                            },
                        },
                    },
                },
            });
        });

        it('deve mapear regras retornadas após a criação', async () => {
            prisma.badge.create.mockResolvedValue({
                ...createStoredBadge('badge-new'),
                ...createBadgeInput,
            });

            const result = await gateway.createBadge(createBadgeInput);

            expect(result.rules).toEqual([
                {
                    id: 'rule-1',
                    badgeId: 'badge-new',
                    type: 'CHALLENGE_COMPLETED',
                    requiredPoints: null,
                    challengeId: CHALLENGE_ID,
                    challengeIri: CHALLENGE_IRI,
                },
            ]);
        });

        it('deve propagar falha ao criar insígnia', async () => {
            prisma.badge.create.mockRejectedValue(
                new Error('Erro ao persistir a insígnia.'),
            );

            await expect(gateway.createBadge(createBadgeInput)).rejects.toThrow(
                'Erro ao persistir a insígnia.',
            );
        });
    });

    describe('createRule', () => {
        it('deve criar uma regra de conclusão de desafio', async () => {
            prisma.badgeRule.create.mockResolvedValue({
                id: 'rule-new',
                ...createRuleInput,
                challenge: {
                    iri: CHALLENGE_IRI,
                },
            });

            const result = await gateway.createRule(createRuleInput);

            expect(result).toEqual({
                id: 'rule-new',
                badgeId: BADGE_ID,
                type: 'CHALLENGE_COMPLETED',
                requiredPoints: null,
                challengeId: CHALLENGE_ID,
                challengeIri: CHALLENGE_IRI,
            });

            expect(prisma.badgeRule.create).toHaveBeenCalledWith({
                data: createRuleInput,
                include: {
                    challenge: {
                        select: {
                            iri: true,
                        },
                    },
                },
            });
        });

        it('deve criar uma regra de pontuação sem desafio', async () => {
            const pointsRuleInput: TCreateBadgeRuleData = {
                badgeId: BADGE_ID,
                type: 'POINTS_THRESHOLD',
                requiredPoints: 50,
                challengeId: null,
            };

            prisma.badgeRule.create.mockResolvedValue({
                id: 'rule-points',
                ...pointsRuleInput,
                challenge: null,
            });

            const result = await gateway.createRule(pointsRuleInput);

            expect(result).toEqual({
                id: 'rule-points',
                ...pointsRuleInput,
                challengeIri: null,
            });
        });

        it('deve tratar relação com desafio ausente', async () => {
            prisma.badgeRule.create.mockResolvedValue({
                id: 'rule-new',
                ...createRuleInput,
            });

            const result = await gateway.createRule(createRuleInput);

            expect(result.challengeIri).toBeNull();
        });

        it('deve propagar falha ao criar uma regra', async () => {
            prisma.badgeRule.create.mockRejectedValue(
                new Error('Erro ao persistir a regra.'),
            );

            await expect(gateway.createRule(createRuleInput)).rejects.toThrow(
                'Erro ao persistir a regra.',
            );
        });
    });

    describe('Falhas nas consultas', () => {
        it('deve propagar erro ao consultar projeto', async () => {
            prisma.project.findUnique.mockRejectedValue(
                new Error('Falha na consulta do projeto.'),
            );

            await expect(gateway.findProjectById(PROJECT_ID)).rejects.toThrow(
                'Falha na consulta do projeto.',
            );
        });

        it('deve propagar erro ao consultar insígnia', async () => {
            prisma.badge.findUnique.mockRejectedValue(
                new Error('Falha na consulta da insígnia.'),
            );

            await expect(gateway.findById(BADGE_ID)).rejects.toThrow(
                'Falha na consulta da insígnia.',
            );
        });

        it('deve propagar erro ao listar insígnias', async () => {
            prisma.badge.findMany.mockRejectedValue(
                new Error('Falha ao listar insígnias.'),
            );

            await expect(
                gateway.findActiveByProjectId(PROJECT_ID),
            ).rejects.toThrow('Falha ao listar insígnias.');
        });

        it('deve propagar erro ao consultar desafio', async () => {
            prisma.challenge.findUnique.mockRejectedValue(
                new Error('Falha na consulta do desafio.'),
            );

            await expect(
                gateway.findChallengeById(CHALLENGE_ID),
            ).rejects.toThrow('Falha na consulta do desafio.');
        });

        it('deve propagar erro ao consultar associação', async () => {
            prisma.projectChallenge.findUnique.mockRejectedValue(
                new Error('Falha ao consultar associação.'),
            );

            await expect(
                gateway.isChallengeLinkedToProject(PROJECT_ID, CHALLENGE_ID),
            ).rejects.toThrow('Falha ao consultar associação.');
        });
    });
});
