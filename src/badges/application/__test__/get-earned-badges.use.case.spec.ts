import { BadRequestException } from '@nestjs/common';

import type { TXApiStatement } from '../../../statements/domain/statements.entities';
import {
    XAPI_ACTIVITY_TYPES,
    XAPI_VERBS,
} from '../../../xapi/domain/xapi.constants';
import { BadgeStatementGateway } from '../../domain/badge-statement.gateway';
import { GetEarnedBadgesUseCase } from '../get-earned-badges.use.case';

describe('GetEarnedBadgesUseCase', () => {
    let useCase: GetEarnedBadgesUseCase;
    let gateway: {
        getByActorAndVerb: jest.Mock;
    };

    const MBOX = 'mailto:aluno@email.com';
    const BADGE_IRI = 'https://gamapi.dev/badges/ux-master';
    const PROJECT_IRI = 'https://gamapi.dev/projects/ux';
    const APPLICATION_IRI = 'https://gamapi.dev/applications/teste';
    const FIRST_DATE = '2026-11-10T10:00:00Z';
    const SECOND_DATE = '2026-11-15T10:00:00Z';

    const createStatement = (
        overrides: Partial<TXApiStatement> = {},
    ): TXApiStatement => ({
        id: 'badge-statement-1',
        actor: {
            name: 'Aluno Teste',
            mbox: MBOX,
        },
        verb: {
            id: XAPI_VERBS.EARNED_BADGE,
        },
        object: {
            id: BADGE_IRI,
            objectType: 'Activity',
            definition: {
                type: XAPI_ACTIVITY_TYPES.BADGE,
                name: {
                    'pt-BR': 'Mestre de UX',
                    'en-US': 'UX Master',
                },
                description: {
                    'pt-BR': 'Concluiu os requisitos de UX.',
                    'en-US': 'Completed the UX requirements.',
                },
            },
        },
        context: {
            statement: {
                objectType: 'StatementRef',
                id: 'original-statement-1',
            },
            contextActivities: {
                grouping: [
                    {
                        id: PROJECT_IRI,
                        objectType: 'Activity',
                        definition: {
                            type: XAPI_ACTIVITY_TYPES.PROJECT,
                        },
                    },
                    {
                        id: APPLICATION_IRI,
                        objectType: 'Activity',
                        definition: {
                            type: XAPI_ACTIVITY_TYPES.EDUCATIONAL_APPLICATION,
                        },
                    },
                ],
            },
        },
        timestamp: FIRST_DATE,
        ...overrides,
    });

    beforeEach(() => {
        gateway = {
            getByActorAndVerb: jest.fn().mockResolvedValue([]),
        };

        useCase = new GetEarnedBadgesUseCase(
            gateway as unknown as BadgeStatementGateway,
        );
    });

    describe('Validação do mbox', () => {
        it.each([
            undefined,
            null,
            '',
            ' ',
            '   ',
            'aluno@email.com',
            'mailto:aluno',
            'mailto:aluno@',
            'mailto:@email.com',
            'mailto:aluno email@email.com',
            'MAILTO:aluno@email.com',
        ])('deve rejeitar mbox inválido: %p', async (invalidMbox) => {
            await expect(
                useCase.execute(invalidMbox as string),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.getByActorAndVerb).not.toHaveBeenCalled();
        });

        it('deve retornar a mensagem de erro para mbox inválido', async () => {
            await expect(useCase.execute('email-invalido')).rejects.toThrow(
                'Informe um mbox válido.',
            );
        });

        it('deve aceitar mbox válido', async () => {
            const result = await useCase.execute(MBOX);

            expect(result.mbox).toBe(MBOX);
            expect(gateway.getByActorAndVerb).toHaveBeenCalledWith(
                MBOX,
                XAPI_VERBS.EARNED_BADGE,
            );
        });

        it('deve remover espaços do início e fim do mbox', async () => {
            const result = await useCase.execute(`  ${MBOX}  `);

            expect(result.mbox).toBe(MBOX);
            expect(gateway.getByActorAndVerb).toHaveBeenCalledWith(
                MBOX,
                XAPI_VERBS.EARNED_BADGE,
            );
        });
    });

    describe('Consulta de insígnias', () => {
        it('deve retornar uma lista vazia quando não existem conquistas', async () => {
            const result = await useCase.execute(MBOX);

            expect(result).toEqual({
                mbox: MBOX,
                total: 0,
                badges: [],
            });

            expect(gateway.getByActorAndVerb).toHaveBeenCalledTimes(1);
        });

        it('deve consultar somente statements de conquista de insígnias', async () => {
            await useCase.execute(MBOX);

            expect(gateway.getByActorAndVerb).toHaveBeenCalledWith(
                MBOX,
                XAPI_VERBS.EARNED_BADGE,
            );
        });

        it('deve propagar erros da consulta ao gateway', async () => {
            gateway.getByActorAndVerb.mockRejectedValue(
                new Error('Falha ao consultar o Ralph.'),
            );

            await expect(useCase.execute(MBOX)).rejects.toThrow(
                'Falha ao consultar o Ralph.',
            );
        });

        it('deve ignorar statements com verbo diferente de EARNED_BADGE', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    verb: {
                        id: XAPI_VERBS.COMPLETED,
                    },
                }),
                createStatement({
                    id: 'points-statement',
                    verb: {
                        id: XAPI_VERBS.EARNED_POINTS,
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.total).toBe(0);
            expect(result.badges).toEqual([]);
        });

        it('deve considerar apenas os statements com verbo EARNED_BADGE', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    id: 'completed-statement',
                    verb: {
                        id: XAPI_VERBS.COMPLETED,
                    },
                }),
                createStatement({
                    id: 'earned-badge-statement',
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.total).toBe(1);
            expect(result.badges[0].statementId).toBe('earned-badge-statement');
        });
    });

    describe('Mapeamento das conquistas', () => {
        it('deve mapear todos os dados de uma insígnia conquistada', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([createStatement()]);

            const result = await useCase.execute(MBOX);

            expect(result).toEqual({
                mbox: MBOX,
                total: 1,
                badges: [
                    {
                        badgeIri: BADGE_IRI,
                        name: 'Mestre de UX',
                        description: 'Concluiu os requisitos de UX.',
                        earnedAt: FIRST_DATE,
                        statementId: 'badge-statement-1',
                        triggerStatementId: 'original-statement-1',
                        projectIri: PROJECT_IRI,
                        applicationIri: APPLICATION_IRI,
                    },
                ],
            });
        });

        it('deve preservar o identificador do statement de conquista', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    id: 'conquista-personalizada',
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.badges[0].statementId).toBe(
                'conquista-personalizada',
            );
        });

        it('deve retornar null quando o statement não possui timestamp', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    timestamp: undefined,
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.badges[0].earnedAt).toBeNull();
        });

        it('deve retornar null quando não existe referência ao statement original', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    context: {
                        contextActivities: {
                            grouping: [],
                        },
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.badges[0].triggerStatementId).toBeNull();
        });

        it('deve preservar a referência ao statement original', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    context: {
                        statement: {
                            objectType: 'StatementRef',
                            id: 'conclusao-123',
                        },
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.badges[0].triggerStatementId).toBe('conclusao-123');
        });
    });

    describe('Nomes e descrições em diferentes idiomas', () => {
        it('deve priorizar pt-BR quando existem vários idiomas', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([createStatement()]);

            const result = await useCase.execute(MBOX);

            expect(result.badges[0].name).toBe('Mestre de UX');
            expect(result.badges[0].description).toBe(
                'Concluiu os requisitos de UX.',
            );
        });

        it('deve utilizar en-US quando pt-BR não existe', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    object: {
                        id: BADGE_IRI,
                        definition: {
                            name: {
                                'en-US': 'UX Master',
                            },
                            description: {
                                'en-US': 'Completed the UX requirements.',
                            },
                        },
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.badges[0].name).toBe('UX Master');
            expect(result.badges[0].description).toBe(
                'Completed the UX requirements.',
            );
        });

        it('deve utilizar o primeiro idioma disponível como alternativa', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    object: {
                        id: BADGE_IRI,
                        definition: {
                            name: {
                                'es-ES': 'Maestro de UX',
                            },
                            description: {
                                'fr-FR': 'Exigences UX terminées.',
                            },
                        },
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.badges[0].name).toBe('Maestro de UX');
            expect(result.badges[0].description).toBe(
                'Exigences UX terminées.',
            );
        });

        it('deve retornar null quando os mapas de idiomas estão vazios', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    object: {
                        id: BADGE_IRI,
                        definition: {
                            name: {},
                            description: {},
                        },
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.badges[0].name).toBeNull();
            expect(result.badges[0].description).toBeNull();
        });

        it('deve retornar null quando nome e descrição não existem', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    object: {
                        id: BADGE_IRI,
                        definition: {
                            type: XAPI_ACTIVITY_TYPES.BADGE,
                        },
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.badges[0].name).toBeNull();
            expect(result.badges[0].description).toBeNull();
        });

        it('deve retornar null quando a definição da atividade não existe', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    object: {
                        id: BADGE_IRI,
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.badges[0].name).toBeNull();
            expect(result.badges[0].description).toBeNull();
        });

        it('deve permitir nome existente e descrição ausente', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    object: {
                        id: BADGE_IRI,
                        definition: {
                            name: {
                                'pt-BR': 'UX Master',
                            },
                        },
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.badges[0].name).toBe('UX Master');
            expect(result.badges[0].description).toBeNull();
        });
    });

    describe('Contexto de projeto e aplicação', () => {
        it('deve identificar o projeto e a aplicação pelo tipo da atividade', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([createStatement()]);

            const result = await useCase.execute(MBOX);

            expect(result.badges[0].projectIri).toBe(PROJECT_IRI);
            expect(result.badges[0].applicationIri).toBe(APPLICATION_IRI);
        });

        it('deve retornar null para projeto e aplicação quando o contexto está ausente', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    context: undefined,
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.badges[0]).toEqual(
                expect.objectContaining({
                    projectIri: null,
                    applicationIri: null,
                    triggerStatementId: null,
                }),
            );
        });

        it('deve aceitar contexto sem contextActivities', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    context: {},
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.badges[0].projectIri).toBeNull();
            expect(result.badges[0].applicationIri).toBeNull();
        });

        it('deve aceitar contextActivities sem grouping', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    context: {
                        contextActivities: {},
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.badges[0].projectIri).toBeNull();
            expect(result.badges[0].applicationIri).toBeNull();
        });

        it('deve aceitar grouping vazio', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    context: {
                        contextActivities: {
                            grouping: [],
                        },
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.badges[0].projectIri).toBeNull();
            expect(result.badges[0].applicationIri).toBeNull();
        });

        it('deve ignorar atividades que não possuem definition', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    context: {
                        contextActivities: {
                            grouping: [
                                {
                                    id: 'https://gamapi.dev/activities/other',
                                },
                            ],
                        },
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.badges[0].projectIri).toBeNull();
            expect(result.badges[0].applicationIri).toBeNull();
        });

        it('deve ignorar atividades de tipos diferentes', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    context: {
                        contextActivities: {
                            grouping: [
                                {
                                    id: 'https://gamapi.dev/challenges/ux',
                                    definition: {
                                        type: XAPI_ACTIVITY_TYPES.CHALLENGE,
                                    },
                                },
                                {
                                    id: 'https://gamapi.dev/points',
                                    definition: {
                                        type: XAPI_ACTIVITY_TYPES.POINTS,
                                    },
                                },
                            ],
                        },
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.badges[0].projectIri).toBeNull();
            expect(result.badges[0].applicationIri).toBeNull();
        });

        it('deve identificar somente o projeto quando a aplicação não existe', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    context: {
                        contextActivities: {
                            grouping: [
                                {
                                    id: PROJECT_IRI,
                                    definition: {
                                        type: XAPI_ACTIVITY_TYPES.PROJECT,
                                    },
                                },
                            ],
                        },
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.badges[0].projectIri).toBe(PROJECT_IRI);
            expect(result.badges[0].applicationIri).toBeNull();
        });

        it('deve identificar somente a aplicação quando o projeto não existe', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    context: {
                        contextActivities: {
                            grouping: [
                                {
                                    id: APPLICATION_IRI,
                                    definition: {
                                        type: XAPI_ACTIVITY_TYPES.EDUCATIONAL_APPLICATION,
                                    },
                                },
                            ],
                        },
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.badges[0].projectIri).toBeNull();
            expect(result.badges[0].applicationIri).toBe(APPLICATION_IRI);
        });
    });

    describe('Prevenção de conquistas duplicadas', () => {
        it('deve manter somente uma conquista da mesma insígnia no mesmo projeto', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    id: 'conquista-1',
                    timestamp: FIRST_DATE,
                }),
                createStatement({
                    id: 'conquista-2',
                    timestamp: SECOND_DATE,
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.total).toBe(1);
            expect(result.badges).toHaveLength(1);
            expect(result.badges[0].statementId).toBe('conquista-1');
        });

        it('deve selecionar a conquista mais antiga quando ela aparece depois', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    id: 'conquista-recente',
                    timestamp: SECOND_DATE,
                }),
                createStatement({
                    id: 'conquista-antiga',
                    timestamp: FIRST_DATE,
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.total).toBe(1);
            expect(result.badges[0].statementId).toBe('conquista-antiga');
            expect(result.badges[0].earnedAt).toBe(FIRST_DATE);
        });

        it('deve manter a primeira conquista quando as datas são iguais', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    id: 'primeira-conquista',
                    timestamp: FIRST_DATE,
                }),
                createStatement({
                    id: 'segunda-conquista',
                    timestamp: FIRST_DATE,
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.total).toBe(1);
            expect(result.badges[0].statementId).toBe('primeira-conquista');
        });

        it('deve substituir conquista sem data por uma conquista datada', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    id: 'sem-data',
                    timestamp: undefined,
                }),
                createStatement({
                    id: 'com-data',
                    timestamp: FIRST_DATE,
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.total).toBe(1);
            expect(result.badges[0].statementId).toBe('com-data');
            expect(result.badges[0].earnedAt).toBe(FIRST_DATE);
        });

        it('não deve substituir conquista datada por outra sem data', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    id: 'com-data',
                    timestamp: FIRST_DATE,
                }),
                createStatement({
                    id: 'sem-data',
                    timestamp: undefined,
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.total).toBe(1);
            expect(result.badges[0].statementId).toBe('com-data');
        });

        it('deve preservar o primeiro registro quando ambos não possuem data', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    id: 'primeiro-sem-data',
                    timestamp: undefined,
                }),
                createStatement({
                    id: 'segundo-sem-data',
                    timestamp: undefined,
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.total).toBe(1);
            expect(result.badges[0].statementId).toBe('primeiro-sem-data');
        });

        it('deve permitir a mesma insígnia em projetos diferentes', async () => {
            const secondProjectIri = 'https://gamapi.dev/projects/outro';

            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    id: 'projeto-1',
                }),
                createStatement({
                    id: 'projeto-2',
                    context: {
                        contextActivities: {
                            grouping: [
                                {
                                    id: secondProjectIri,
                                    definition: {
                                        type: XAPI_ACTIVITY_TYPES.PROJECT,
                                    },
                                },
                            ],
                        },
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.total).toBe(2);
            expect(
                result.badges.map((earnedBadge) => earnedBadge.projectIri),
            ).toEqual(expect.arrayContaining([PROJECT_IRI, secondProjectIri]));
        });

        it('deve permitir insígnias diferentes no mesmo projeto', async () => {
            const secondBadgeIri = 'https://gamapi.dev/badges/advanced-ux';

            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    id: 'badge-1',
                }),
                createStatement({
                    id: 'badge-2',
                    object: {
                        id: secondBadgeIri,
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.total).toBe(2);
            expect(
                result.badges.map((earnedBadge) => earnedBadge.badgeIri),
            ).toEqual(expect.arrayContaining([BADGE_IRI, secondBadgeIri]));
        });
    });

    describe('Ordenação das conquistas', () => {
        it('deve ordenar da conquista mais recente para a mais antiga', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    id: 'antiga',
                    timestamp: FIRST_DATE,
                }),
                createStatement({
                    id: 'recente',
                    timestamp: SECOND_DATE,
                    object: {
                        id: 'https://gamapi.dev/badges/outra',
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(
                result.badges.map((earnedBadge) => earnedBadge.statementId),
            ).toEqual(['recente', 'antiga']);
        });

        it('deve ordenar corretamente quando a entrada já está em ordem decrescente', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    id: 'recente',
                    timestamp: SECOND_DATE,
                }),
                createStatement({
                    id: 'antiga',
                    timestamp: FIRST_DATE,
                    object: {
                        id: 'https://gamapi.dev/badges/outra',
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(
                result.badges.map((earnedBadge) => earnedBadge.statementId),
            ).toEqual(['recente', 'antiga']);
        });

        it('deve posicionar conquistas sem data após conquistas datadas', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    id: 'sem-data',
                    timestamp: undefined,
                }),
                createStatement({
                    id: 'com-data',
                    timestamp: SECOND_DATE,
                    object: {
                        id: 'https://gamapi.dev/badges/outra',
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(
                result.badges.map((earnedBadge) => earnedBadge.statementId),
            ).toEqual(['com-data', 'sem-data']);
        });

        it('deve ordenar quando a conquista datada aparece primeiro', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    id: 'com-data',
                    timestamp: SECOND_DATE,
                }),
                createStatement({
                    id: 'sem-data',
                    timestamp: undefined,
                    object: {
                        id: 'https://gamapi.dev/badges/outra',
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(
                result.badges.map((earnedBadge) => earnedBadge.statementId),
            ).toEqual(['com-data', 'sem-data']);
        });

        it('deve preservar ambas as conquistas sem data quando são distintas', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                createStatement({
                    id: 'badge-a',
                    timestamp: undefined,
                }),
                createStatement({
                    id: 'badge-b',
                    timestamp: undefined,
                    object: {
                        id: 'https://gamapi.dev/badges/outra',
                    },
                }),
            ]);

            const result = await useCase.execute(MBOX);

            expect(result.total).toBe(2);
            expect(
                result.badges.map((earnedBadge) => earnedBadge.statementId),
            ).toEqual(['badge-a', 'badge-b']);
        });
    });
});
