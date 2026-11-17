import { BadRequestException, NotFoundException } from '@nestjs/common';

import type {
    TApplication,
    TProject,
} from '../../../configuration/domain/configuration.entities';
import type { ConfigurationGateway } from '../../../configuration/domain/configuration.gateway';
import type { TXApiStatement } from '../../../statements/domain/statements.entities';
import {
    XAPI_ACTIVITY_TYPES,
    XAPI_EXTENSIONS,
    XAPI_VERBS,
} from '../../../xapi/domain/xapi.constants';
import { GetProjectLeaderboardUseCase } from '../get-project-leaderboard.use.case';

describe('GetProjectLeaderboardUseCase', () => {
    const APPLICATION_IRI = 'https://gamapi.dev/applications/educacional';
    const PROJECT_IRI = 'https://gamapi.dev/projects/ux';
    const POINTS_IRI = 'https://gamapi.dev/points';

    const application: TApplication = {
        id: 'application-1',
        name: 'Aplicação Educacional',
        iri: APPLICATION_IRI,
        active: true,
    };

    const project: TProject = {
        id: 'project-1',
        name: 'Projeto UX',
        iri: PROJECT_IRI,
        applicationId: application.id,
        active: true,
    };

    const projectActivity = {
        id: PROJECT_IRI,
        definition: { type: XAPI_ACTIVITY_TYPES.PROJECT },
    };

    const applicationActivity = {
        id: APPLICATION_IRI,
        definition: { type: XAPI_ACTIVITY_TYPES.EDUCATIONAL_APPLICATION },
    };

    const completion = (
        id: string,
        mbox = 'mailto:ana@email.com',
        name = 'Ana',
    ): TXApiStatement => ({
        id,
        actor: { mbox, name },
        verb: { id: XAPI_VERBS.COMPLETED },
        object: { id: `https://gamapi.dev/challenges/${id}` },
        context: {
            contextActivities: {
                grouping: [projectActivity, applicationActivity],
            },
        },
    });

    const reward = (
        id: string,
        completionId: string,
        mbox = 'mailto:ana@email.com',
        points: number | string | boolean = 10,
        name = 'Ana',
    ): TXApiStatement => ({
        id,
        actor: { mbox, name },
        verb: { id: XAPI_VERBS.EARNED_POINTS },
        object: { id: POINTS_IRI },
        context: {
            statement: { objectType: 'StatementRef', id: completionId },
        },
        result: {
            extensions: { [XAPI_EXTENSIONS.POINTS]: points },
        },
    });

    let useCase: GetProjectLeaderboardUseCase;
    let configurationGateway: {
        findProjectById: jest.Mock<Promise<TProject | null>, [string]>;
        findApplicationById: jest.Mock<Promise<TApplication | null>, [string]>;
    };
    let leaderboardGateway: {
        getByVerb: jest.Mock<Promise<TXApiStatement[]>, [string]>;
    };

    beforeEach(() => {
        configurationGateway = {
            findProjectById: jest
                .fn<Promise<TProject | null>, [string]>()
                .mockResolvedValue(project),
            findApplicationById: jest
                .fn<Promise<TApplication | null>, [string]>()
                .mockResolvedValue(application),
        };

        leaderboardGateway = {
            getByVerb: jest
                .fn<Promise<TXApiStatement[]>, [string]>()
                .mockResolvedValue([]),
        };

        useCase = new GetProjectLeaderboardUseCase(
            configurationGateway as unknown as ConfigurationGateway,
            leaderboardGateway,
        );
    });

    const setHistory = (
        completions: TXApiStatement[],
        rewards: TXApiStatement[],
    ): void => {
        leaderboardGateway.getByVerb.mockImplementation((verb: string) =>
            Promise.resolve(
                verb === XAPI_VERBS.COMPLETED ? completions : rewards,
            ),
        );
    };

    describe('validação dos parâmetros', () => {
        it.each(['', null, undefined])(
            'rejeita identificador de projeto ausente: %p',
            async (projectId) => {
                await expect(
                    useCase.execute(projectId as string),
                ).rejects.toThrow('Informe o projeto.');

                expect(
                    configurationGateway.findProjectById,
                ).not.toHaveBeenCalled();
                expect(leaderboardGateway.getByVerb).not.toHaveBeenCalled();
            },
        );

        it.each([0, -1, 101, 1.5, NaN, Infinity, -Infinity])(
            'rejeita limite inválido: %p',
            async (limit) => {
                await expect(
                    useCase.execute(project.id, limit),
                ).rejects.toThrow(BadRequestException);

                expect(
                    configurationGateway.findProjectById,
                ).not.toHaveBeenCalled();
            },
        );

        it('retorna a mensagem de limite inválido', async () => {
            await expect(useCase.execute(project.id, 0)).rejects.toThrow(
                'O limite deve ser um inteiro entre 1 e 100.',
            );
        });

        it.each([1, 100])('aceita limite %i', async (limit) => {
            const result = await useCase.execute(project.id, limit);

            expect(result.leaderboard).toEqual([]);
            expect(leaderboardGateway.getByVerb).toHaveBeenCalledTimes(2);
        });

        it('utiliza limite padrão de dez participantes', async () => {
            const completions = Array.from({ length: 12 }, (_, index) =>
                completion(`completion-${index}`, `mailto:${index}@email.com`),
            );
            const rewards = completions.map((statement, index) =>
                reward(
                    `reward-${index}`,
                    statement.id,
                    statement.actor.mbox,
                    index + 1,
                ),
            );

            setHistory(completions, rewards);

            const result = await useCase.execute(project.id);

            expect(result.leaderboard).toHaveLength(10);
            expect(result.leaderboard[0].points).toBe(12);
            expect(result.leaderboard[9].points).toBe(3);
        });
    });

    describe('consulta do projeto e da aplicação', () => {
        it('consulta projeto e aplicação antes de buscar statements', async () => {
            await useCase.execute(project.id);

            expect(configurationGateway.findProjectById).toHaveBeenCalledWith(
                project.id,
            );
            expect(
                configurationGateway.findApplicationById,
            ).toHaveBeenCalledWith(application.id);
            expect(leaderboardGateway.getByVerb).toHaveBeenCalledWith(
                XAPI_VERBS.COMPLETED,
            );
            expect(leaderboardGateway.getByVerb).toHaveBeenCalledWith(
                XAPI_VERBS.EARNED_POINTS,
            );
            expect(leaderboardGateway.getByVerb).toHaveBeenCalledTimes(2);
        });

        it.each([null, undefined, { ...project, active: false }])(
            'rejeita projeto ausente ou inativo: %p',
            async (foundProject) => {
                configurationGateway.findProjectById.mockResolvedValue(
                    foundProject ?? null,
                );

                await expect(useCase.execute(project.id)).rejects.toThrow(
                    'Projeto não encontrado ou inativo.',
                );
                expect(
                    configurationGateway.findApplicationById,
                ).not.toHaveBeenCalled();
                expect(leaderboardGateway.getByVerb).not.toHaveBeenCalled();
            },
        );

        it.each([null, undefined, { ...application, active: false }])(
            'rejeita aplicação ausente ou inativa: %p',
            async (foundApplication) => {
                configurationGateway.findApplicationById.mockResolvedValue(
                    foundApplication ?? null,
                );

                await expect(useCase.execute(project.id)).rejects.toThrow(
                    NotFoundException,
                );
                await expect(useCase.execute(project.id)).rejects.toThrow(
                    'Aplicação não encontrada ou inativa.',
                );
                expect(leaderboardGateway.getByVerb).not.toHaveBeenCalled();
            },
        );

        it('propaga erros da consulta do projeto', async () => {
            const error = new Error('Falha ao consultar projeto');
            configurationGateway.findProjectById.mockRejectedValue(error);

            await expect(useCase.execute(project.id)).rejects.toBe(error);
        });

        it('propaga erros da consulta da aplicação', async () => {
            const error = new Error('Falha ao consultar aplicação');
            configurationGateway.findApplicationById.mockRejectedValue(error);

            await expect(useCase.execute(project.id)).rejects.toBe(error);
        });

        it('propaga erros da consulta de statements', async () => {
            const error = new Error('Ralph indisponível');
            leaderboardGateway.getByVerb.mockRejectedValue(error);

            await expect(useCase.execute(project.id)).rejects.toBe(error);
        });

        it('retorna identificação do projeto com classificação vazia', async () => {
            const result = await useCase.execute(project.id);

            expect(result).toEqual({
                projectId: project.id,
                projectName: project.name,
                leaderboard: [],
            });
        });
    });

    describe('filtragem das conclusões', () => {
        it('considera somente conclusões do projeto e da aplicação', async () => {
            const correct = completion('correct');
            const wrongProject = {
                ...completion('wrong-project'),
                context: {
                    contextActivities: {
                        grouping: [
                            {
                                ...projectActivity,
                                id: 'https://gamapi.dev/projects/other',
                            },
                            applicationActivity,
                        ],
                    },
                },
            };
            const wrongApplication = {
                ...completion('wrong-application'),
                context: {
                    contextActivities: {
                        grouping: [
                            projectActivity,
                            {
                                ...applicationActivity,
                                id: 'https://gamapi.dev/applications/other',
                            },
                        ],
                    },
                },
            };
            setHistory(
                [correct, wrongProject, wrongApplication],
                [
                    reward('reward-correct', 'correct', undefined, 15),
                    reward('reward-project', 'wrong-project', undefined, 90),
                    reward('reward-app', 'wrong-application', undefined, 90),
                ],
            );

            const result = await useCase.execute(project.id);

            expect(result.leaderboard).toEqual([
                {
                    position: 1,
                    name: 'Ana',
                    mbox: 'mailto:ana@email.com',
                    points: 15,
                },
            ]);
        });

        it('ignora conclusões sem contexto, agrupamento ou tipo correto', async () => {
            const missingContext = {
                ...completion('missing-context'),
                context: undefined,
            };
            const missingActivities = {
                ...completion('missing-activities'),
                context: {},
            };
            const missingGrouping = {
                ...completion('missing-grouping'),
                context: { contextActivities: {} },
            };
            const emptyGrouping = {
                ...completion('empty-grouping'),
                context: { contextActivities: { grouping: [] } },
            };
            const missingDefinition = {
                ...completion('missing-definition'),
                context: {
                    contextActivities: {
                        grouping: [{ id: PROJECT_IRI }, applicationActivity],
                    },
                },
            };
            const wrongType = {
                ...completion('wrong-type'),
                context: {
                    contextActivities: {
                        grouping: [
                            {
                                id: PROJECT_IRI,
                                definition: {
                                    type: XAPI_ACTIVITY_TYPES.CHALLENGE,
                                },
                            },
                            applicationActivity,
                        ],
                    },
                },
            };

            const invalidCompletions: TXApiStatement[] = [
                missingContext,
                missingActivities,
                missingGrouping,
                emptyGrouping,
                missingDefinition,
                wrongType,
            ];

            setHistory(
                invalidCompletions,
                invalidCompletions.map((statement) =>
                    reward(`reward-${statement.id}`, statement.id),
                ),
            );

            const result = await useCase.execute(project.id);

            expect(result.leaderboard).toEqual([]);
        });

        it('identifica atividades independentemente da ordem', async () => {
            const statement = {
                ...completion('reordered'),
                context: {
                    contextActivities: {
                        grouping: [applicationActivity, projectActivity],
                    },
                },
            };
            setHistory([statement], [reward('r1', 'reordered')]);

            const result = await useCase.execute(project.id);

            expect(result.leaderboard[0].points).toBe(10);
        });

        it('utiliza a última conclusão quando existem IDs repetidos', async () => {
            const firstCompletion = completion(
                'duplicate',
                'mailto:first@email.com',
            );
            const lastCompletion = completion(
                'duplicate',
                'mailto:last@email.com',
                'Último',
            );
            setHistory(
                [firstCompletion, lastCompletion],
                [
                    reward('r1', 'duplicate', 'mailto:first@email.com', 50),
                    reward(
                        'r2',
                        'duplicate',
                        'mailto:last@email.com',
                        20,
                        'Último',
                    ),
                ],
            );

            const result = await useCase.execute(project.id);

            expect(result.leaderboard).toEqual([
                {
                    position: 1,
                    name: 'Último',
                    mbox: 'mailto:last@email.com',
                    points: 20,
                },
            ]);
        });
    });

    describe('cálculo da pontuação', () => {
        it('ignora recompensas sem referência, conclusão ou ator correspondente', async () => {
            setHistory(
                [completion('c1')],
                [
                    reward('unknown', 'other', undefined, 50),
                    { ...reward('no-context', 'c1'), context: undefined },
                    { ...reward('no-ref', 'c1'), context: {} },
                    reward('wrong-actor', 'c1', 'mailto:outro@email.com', 100),
                    reward('correct', 'c1', undefined, 15),
                ],
            );

            const result = await useCase.execute(project.id);

            expect(result.leaderboard).toHaveLength(1);
            expect(result.leaderboard[0].points).toBe(15);
        });

        it('ignora pontos ausentes, inválidos, negativos e não finitos', async () => {
            const noResult = {
                ...reward('no-result', 'c1'),
                result: undefined,
            };
            const noExtensions = {
                ...reward('no-extensions', 'c1'),
                result: {},
            };
            const noPoints = {
                ...reward('no-points', 'c1'),
                result: { extensions: {} },
            };

            setHistory(
                [completion('c1')],
                [
                    noResult,
                    noExtensions,
                    noPoints,
                    reward('string', 'c1', undefined, '20'),
                    reward('boolean', 'c1', undefined, true),
                    reward('nan', 'c1', undefined, NaN),
                    reward('infinity', 'c1', undefined, Infinity),
                    reward('negative-infinity', 'c1', undefined, -Infinity),
                    reward('negative', 'c1', undefined, -2),
                    reward('valid', 'c1', undefined, 3),
                ],
            );

            const result = await useCase.execute(project.id);

            expect(result.leaderboard[0].points).toBe(3);
        });

        it('aceita pontuação zero e valores decimais positivos', async () => {
            setHistory(
                [completion('c1')],
                [
                    reward('zero', 'c1', undefined, 0),
                    reward('decimal', 'c1', undefined, 1.5),
                ],
            );

            const result = await useCase.execute(project.id);

            expect(result.leaderboard[0].points).toBe(1.5);
        });

        it('acumula pontos por e-mail em múltiplas conclusões', async () => {
            setHistory(
                [completion('c1'), completion('c2')],
                [
                    reward('r1', 'c1', undefined, 20),
                    reward('r2', 'c2', undefined, 30),
                ],
            );

            const result = await useCase.execute(project.id);

            expect(result.leaderboard).toEqual([
                {
                    position: 1,
                    name: 'Ana',
                    mbox: 'mailto:ana@email.com',
                    points: 50,
                },
            ]);
        });

        it('usa o nome da recompensa quando estiver disponível', async () => {
            setHistory(
                [completion('c1', 'mailto:ana@email.com', 'Nome da conclusão')],
                [reward('r1', 'c1', undefined, 10, 'Nome da recompensa')],
            );

            const result = await useCase.execute(project.id);

            expect(result.leaderboard[0].name).toBe('Nome da recompensa');
        });

        it('usa o nome da conclusão quando a recompensa não tem nome', async () => {
            setHistory(
                [completion('c1', 'mailto:ana@email.com', 'Nome da conclusão')],
                [reward('r1', 'c1', undefined, 10, '')],
            );

            const result = await useCase.execute(project.id);

            expect(result.leaderboard[0].name).toBe('Nome da conclusão');
        });

        it('usa o mbox quando ambos os nomes estão ausentes', async () => {
            setHistory(
                [completion('c1', 'mailto:ana@email.com', '')],
                [reward('r1', 'c1', undefined, 10, '')],
            );

            const result = await useCase.execute(project.id);

            expect(result.leaderboard[0].name).toBe('mailto:ana@email.com');
        });

        it('usa os dados da última recompensa ao acumular pontos', async () => {
            setHistory(
                [completion('c1')],
                [
                    reward('r1', 'c1', undefined, 10, 'Primeiro nome'),
                    reward('r2', 'c1', undefined, 20, 'Último nome'),
                ],
            );

            const result = await useCase.execute(project.id);

            expect(result.leaderboard[0]).toEqual({
                position: 1,
                name: 'Último nome',
                mbox: 'mailto:ana@email.com',
                points: 30,
            });
        });
    });

    describe('ordenação e limite', () => {
        it('ordena por pontos decrescentes e numera as posições', async () => {
            setHistory(
                [
                    completion('ana', 'mailto:ana@email.com', 'Ana'),
                    completion('bia', 'mailto:bia@email.com', 'Bia'),
                    completion('caio', 'mailto:caio@email.com', 'Caio'),
                ],
                [
                    reward('a', 'ana', 'mailto:ana@email.com', 10, 'Ana'),
                    reward('b', 'bia', 'mailto:bia@email.com', 30, 'Bia'),
                    reward('c', 'caio', 'mailto:caio@email.com', 20, 'Caio'),
                ],
            );

            const result = await useCase.execute(project.id);

            expect(result.leaderboard).toEqual([
                {
                    position: 1,
                    name: 'Bia',
                    mbox: 'mailto:bia@email.com',
                    points: 30,
                },
                {
                    position: 2,
                    name: 'Caio',
                    mbox: 'mailto:caio@email.com',
                    points: 20,
                },
                {
                    position: 3,
                    name: 'Ana',
                    mbox: 'mailto:ana@email.com',
                    points: 10,
                },
            ]);
        });

        it('desempata pontuações iguais pelo mbox em ordem alfabética', async () => {
            setHistory(
                [
                    completion('z', 'mailto:z@email.com', 'Z'),
                    completion('a', 'mailto:a@email.com', 'A'),
                ],
                [
                    reward('rz', 'z', 'mailto:z@email.com', 20, 'Z'),
                    reward('ra', 'a', 'mailto:a@email.com', 20, 'A'),
                ],
            );

            const result = await useCase.execute(project.id);

            expect(result.leaderboard.map((entry) => entry.mbox)).toEqual([
                'mailto:a@email.com',
                'mailto:z@email.com',
            ]);
        });

        it('limita a quantidade de participantes classificados', async () => {
            setHistory(
                [
                    completion('a', 'mailto:a@email.com'),
                    completion('b', 'mailto:b@email.com'),
                ],
                [
                    reward('ra', 'a', 'mailto:a@email.com', 10),
                    reward('rb', 'b', 'mailto:b@email.com', 20),
                ],
            );

            const result = await useCase.execute(project.id, 1);

            expect(result.leaderboard).toHaveLength(1);
            expect(result.leaderboard[0].mbox).toBe('mailto:b@email.com');
            expect(result.leaderboard[0].position).toBe(1);
        });
    });
});
