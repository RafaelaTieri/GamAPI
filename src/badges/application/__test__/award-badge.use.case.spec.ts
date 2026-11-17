import type { TXApiStatement } from '../../../statements/domain/statements.entities';
import { deterministicStatementId } from '../../../common/utils/deterministic-statement-id';
import { IdempotentStatementUseCase } from '../../../idempotency/application/idempotent-statement.use.case';
import {
    XAPI_ACTIVITY_TYPES,
    XAPI_VERBS,
} from '../../../xapi/domain/xapi.constants';

import type { TBadge } from '../../domain/badge.entities';
import { AwardBadgeUseCase } from '../award-badge.use.case';

describe('AwardBadgeUseCase', () => {
    let useCase: AwardBadgeUseCase;
    let ensureBadgeMock: jest.MockedFunction<
        IdempotentStatementUseCase['ensureBadge']
    >;

    const badge: TBadge = {
        id: 'badge-1',
        name: 'UX Master',
        description: 'Concluiu os requisitos de UX.',
        iri: 'https://gamapi.dev/badges/ux-master',
        imageUrl: null,
        projectId: 'project-1',
        ruleOperator: 'ALL',
        active: true,
        rules: [],
    };

    const createOriginalStatement = (
        overrides: Partial<TXApiStatement> = {},
    ): TXApiStatement => ({
        id: '0de5cceb-89cb-4b9a-a7af-b515d4513ef2',
        actor: {
            name: 'Aluno Teste',
            mbox: 'mailto:aluno@email.com',
        },
        verb: {
            id: XAPI_VERBS.COMPLETED,
        },
        object: {
            id: 'https://gamapi.dev/challenges/testes-de-ux',
            objectType: 'Activity',
            definition: {
                type: XAPI_ACTIVITY_TYPES.CHALLENGE,
            },
        },
        context: {
            contextActivities: {
                grouping: [
                    {
                        id: 'https://gamapi.dev/applications/teste',
                        objectType: 'Activity',
                        definition: {
                            type: XAPI_ACTIVITY_TYPES.EDUCATIONAL_APPLICATION,
                        },
                    },
                    {
                        id: 'https://gamapi.dev/projects/teste',
                        objectType: 'Activity',
                        definition: {
                            type: XAPI_ACTIVITY_TYPES.PROJECT,
                        },
                    },
                ],
            },
        },
        ...overrides,
    });

    beforeEach(() => {
        ensureBadgeMock = jest.fn((statement: TXApiStatement) =>
            Promise.resolve({
                statement,
                created: true,
            }),
        );

        useCase = new AwardBadgeUseCase({
            ensureBadge: ensureBadgeMock,
        } as unknown as IdempotentStatementUseCase);
    });

    describe('Insígnia já conquistada', () => {
        it('deve retornar null quando a insígnia já foi conquistada', async () => {
            const originalStatement = createOriginalStatement();
            const alreadyEarnedBadgeIris = new Set([badge.iri]);

            const result = await useCase.execute(
                badge,
                originalStatement,
                alreadyEarnedBadgeIris,
            );

            expect(result).toBeNull();
            expect(ensureBadgeMock).not.toHaveBeenCalled();
            expect(alreadyEarnedBadgeIris.has(badge.iri)).toBe(true);
        });

        it('não deve registrar novamente a mesma insígnia', async () => {
            const originalStatement = createOriginalStatement();
            const alreadyEarnedBadgeIris = new Set<string>();

            const firstResult = await useCase.execute(
                badge,
                originalStatement,
                alreadyEarnedBadgeIris,
            );

            const secondResult = await useCase.execute(
                badge,
                originalStatement,
                alreadyEarnedBadgeIris,
            );

            expect(firstResult).not.toBeNull();
            expect(secondResult).toBeNull();
            expect(ensureBadgeMock).toHaveBeenCalledTimes(1);
            expect(alreadyEarnedBadgeIris.has(badge.iri)).toBe(true);
        });
    });

    describe('Concessão de nova insígnia', () => {
        it('deve gerar e registrar corretamente o statement de conquista', async () => {
            const originalStatement = createOriginalStatement();
            const alreadyEarnedBadgeIris = new Set<string>();

            const result = await useCase.execute(
                badge,
                originalStatement,
                alreadyEarnedBadgeIris,
            );

            const expectedStatementId = deterministicStatementId(
                'earned-badge',
                badge.projectId,
                originalStatement.actor.mbox,
                badge.iri,
            );

            const expectedStatement: TXApiStatement = {
                id: expectedStatementId,
                actor: originalStatement.actor,
                verb: {
                    id: XAPI_VERBS.EARNED_BADGE,
                    display: {
                        'pt-BR': 'conquistou',
                    },
                },
                object: {
                    id: badge.iri,
                    objectType: 'Activity',
                    definition: {
                        type: XAPI_ACTIVITY_TYPES.BADGE,
                        name: {
                            'pt-BR': badge.name,
                        },
                        description: {
                            'pt-BR': badge.description,
                        },
                    },
                },
                context: {
                    statement: {
                        objectType: 'StatementRef',
                        id: originalStatement.id,
                    },
                    contextActivities: {
                        grouping:
                            originalStatement.context?.contextActivities
                                ?.grouping,
                    },
                },
            };

            expect(ensureBadgeMock).toHaveBeenCalledTimes(1);
            expect(ensureBadgeMock).toHaveBeenCalledWith(expectedStatement);

            expect(result).toEqual(expectedStatement);
            expect(alreadyEarnedBadgeIris.has(badge.iri)).toBe(true);
        });

        it('deve manter o mesmo identificador para a mesma conquista', async () => {
            const originalStatement = createOriginalStatement();

            await useCase.execute(badge, originalStatement, new Set<string>());

            await useCase.execute(badge, originalStatement, new Set<string>());

            const firstStatement = ensureBadgeMock.mock.calls[0][0];
            const secondStatement = ensureBadgeMock.mock.calls[1][0];

            expect(firstStatement.id).toBe(secondStatement.id);
        });

        it('deve gerar identificadores diferentes para participantes diferentes', async () => {
            const firstStatement = createOriginalStatement();

            const secondStatement = createOriginalStatement({
                actor: {
                    name: 'Outro Aluno',
                    mbox: 'mailto:outro@email.com',
                },
            });

            await useCase.execute(badge, firstStatement, new Set<string>());

            await useCase.execute(badge, secondStatement, new Set<string>());

            const firstBadgeStatement = ensureBadgeMock.mock.calls[0][0];
            const secondBadgeStatement = ensureBadgeMock.mock.calls[1][0];

            expect(firstBadgeStatement.id).not.toBe(secondBadgeStatement.id);
        });

        it('deve adicionar a insígnia ao conjunto após o registro', async () => {
            const originalStatement = createOriginalStatement();
            const alreadyEarnedBadgeIris = new Set<string>();

            expect(alreadyEarnedBadgeIris.has(badge.iri)).toBe(false);

            await useCase.execute(
                badge,
                originalStatement,
                alreadyEarnedBadgeIris,
            );

            expect(alreadyEarnedBadgeIris.has(badge.iri)).toBe(true);
        });
    });

    describe('Idempotência', () => {
        it('deve retornar o statement quando o registro for novo', async () => {
            const originalStatement = createOriginalStatement();

            const result = await useCase.execute(
                badge,
                originalStatement,
                new Set<string>(),
            );

            const generatedStatement = ensureBadgeMock.mock.calls[0][0];

            expect(result).toEqual(generatedStatement);
            expect(ensureBadgeMock).toHaveBeenCalledTimes(1);
        });

        it('deve retornar null quando o registro já existir no Ralph', async () => {
            ensureBadgeMock.mockImplementation((statement: TXApiStatement) =>
                Promise.resolve({
                    statement,
                    created: false,
                }),
            );

            const originalStatement = createOriginalStatement();
            const alreadyEarnedBadgeIris = new Set<string>();

            const result = await useCase.execute(
                badge,
                originalStatement,
                alreadyEarnedBadgeIris,
            );

            expect(result).toBeNull();
            expect(ensureBadgeMock).toHaveBeenCalledTimes(1);
            expect(alreadyEarnedBadgeIris.has(badge.iri)).toBe(true);
        });

        it('não deve adicionar a insígnia quando o registro falhar', async () => {
            ensureBadgeMock.mockRejectedValue(
                new Error('Falha ao registrar statement no Ralph.'),
            );

            const originalStatement = createOriginalStatement();
            const alreadyEarnedBadgeIris = new Set<string>();

            await expect(
                useCase.execute(
                    badge,
                    originalStatement,
                    alreadyEarnedBadgeIris,
                ),
            ).rejects.toThrow('Falha ao registrar statement no Ralph.');

            expect(ensureBadgeMock).toHaveBeenCalledTimes(1);
            expect(alreadyEarnedBadgeIris.has(badge.iri)).toBe(false);
        });
    });

    describe('Contexto do statement original', () => {
        it('deve preservar as atividades de agrupamento', async () => {
            const originalStatement = createOriginalStatement();

            await useCase.execute(badge, originalStatement, new Set<string>());

            const generatedStatement = ensureBadgeMock.mock.calls[0][0];

            expect(
                generatedStatement.context?.contextActivities?.grouping,
            ).toEqual(originalStatement.context?.contextActivities?.grouping);
        });

        it('deve utilizar uma lista vazia quando não existir contexto', async () => {
            const originalStatement = createOriginalStatement({
                context: undefined,
            });

            await useCase.execute(badge, originalStatement, new Set<string>());

            const generatedStatement = ensureBadgeMock.mock.calls[0][0];

            expect(
                generatedStatement.context?.contextActivities?.grouping,
            ).toEqual([]);
        });

        it('deve utilizar uma lista vazia quando não existirem contextActivities', async () => {
            const originalStatement = createOriginalStatement({
                context: {},
            });

            await useCase.execute(badge, originalStatement, new Set<string>());

            const generatedStatement = ensureBadgeMock.mock.calls[0][0];

            expect(
                generatedStatement.context?.contextActivities?.grouping,
            ).toEqual([]);
        });

        it('deve utilizar uma lista vazia quando grouping estiver ausente', async () => {
            const originalStatement = createOriginalStatement({
                context: {
                    contextActivities: {},
                },
            });

            await useCase.execute(badge, originalStatement, new Set<string>());

            const generatedStatement = ensureBadgeMock.mock.calls[0][0];

            expect(
                generatedStatement.context?.contextActivities?.grouping,
            ).toEqual([]);
        });

        it('deve aceitar grouping explicitamente vazio', async () => {
            const originalStatement = createOriginalStatement({
                context: {
                    contextActivities: {
                        grouping: [],
                    },
                },
            });

            await useCase.execute(badge, originalStatement, new Set<string>());

            const generatedStatement = ensureBadgeMock.mock.calls[0][0];

            expect(
                generatedStatement.context?.contextActivities?.grouping,
            ).toEqual([]);
        });
    });
});
