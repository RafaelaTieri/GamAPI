import { ConflictException, ServiceUnavailableException } from '@nestjs/common';

import type { TXApiStatement } from '../../../statements/domain/statements.entities';
import {
    XAPI_ACTIVITY_TYPES,
    XAPI_VERBS,
} from '../../../xapi/domain/xapi.constants';
import { IdempotentStatementUseCase } from '../idempotent-statement.use.case';

describe('IdempotentStatementUseCase', () => {
    const ACTOR_MBOX = 'mailto:aluno@email.com';
    const PROJECT_IRI = 'https://gamapi.dev/projects/ux';
    const OTHER_PROJECT_IRI = 'https://gamapi.dev/projects/outro';
    const CHALLENGE_IRI = 'https://gamapi.dev/challenges/ux';
    const BADGE_IRI = 'https://gamapi.dev/badges/ux';
    const POINTS_IRI = 'https://gamapi.dev/points';

    const grouping = (projectIri: string = PROJECT_IRI) => [
        {
            id: projectIri,
            definition: { type: XAPI_ACTIVITY_TYPES.PROJECT },
        },
    ];

    const original = (
        overrides: Partial<TXApiStatement> = {},
    ): TXApiStatement => ({
        id: 'statement-original',
        actor: { mbox: ACTOR_MBOX, name: 'Aluno' },
        verb: { id: XAPI_VERBS.COMPLETED },
        object: { id: CHALLENGE_IRI, objectType: 'Activity' },
        context: { contextActivities: { grouping: grouping() } },
        result: { extensions: { 'https://gamapi.dev/extensions/score': 20 } },
        timestamp: '2026-11-01T10:00:00Z',
        ...overrides,
    });

    const points = (
        overrides: Partial<TXApiStatement> = {},
    ): TXApiStatement => ({
        id: 'statement-points',
        actor: { mbox: ACTOR_MBOX },
        verb: { id: XAPI_VERBS.EARNED_POINTS },
        object: { id: POINTS_IRI },
        context: {
            statement: {
                objectType: 'StatementRef',
                id: 'statement-original',
            },
            contextActivities: { grouping: grouping() },
        },
        ...overrides,
    });

    const badge = (
        overrides: Partial<TXApiStatement> = {},
    ): TXApiStatement => ({
        id: 'statement-badge',
        actor: { mbox: ACTOR_MBOX },
        verb: { id: XAPI_VERBS.EARNED_BADGE },
        object: { id: BADGE_IRI },
        context: { contextActivities: { grouping: grouping() } },
        ...overrides,
    });

    let gateway: {
        getById: jest.Mock<Promise<TXApiStatement | null>, [string]>;
        getByActorAndVerb: jest.Mock<
            Promise<TXApiStatement[]>,
            [string, string]
        >;
        create: jest.Mock<Promise<void>, [TXApiStatement]>;
    };
    let useCase: IdempotentStatementUseCase;

    const axiosError = (status?: number): Error =>
        Object.assign(new Error('Falha HTTP'), {
            isAxiosError: true,
            response: status === undefined ? undefined : { status },
        });

    beforeEach(() => {
        gateway = {
            getById: jest
                .fn<Promise<TXApiStatement | null>, [string]>()
                .mockResolvedValue(null),
            getByActorAndVerb: jest
                .fn<Promise<TXApiStatement[]>, [string, string]>()
                .mockResolvedValue([]),
            create: jest
                .fn<Promise<void>, [TXApiStatement]>()
                .mockResolvedValue(undefined),
        };
        useCase = new IdempotentStatementUseCase(gateway);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('findById', () => {
        it('deve consultar e retornar o statement encontrado', async () => {
            const statement = original();
            gateway.getById.mockResolvedValue(statement);

            await expect(useCase.findById(statement.id)).resolves.toBe(
                statement,
            );
            expect(gateway.getById).toHaveBeenCalledWith(statement.id);
        });

        it('deve retornar null quando o statement não existir', async () => {
            await expect(useCase.findById('inexistente')).resolves.toBeNull();
        });

        it('deve propagar falhas na consulta', async () => {
            const error = new Error('Erro de consulta');
            gateway.getById.mockRejectedValue(error);

            await expect(useCase.findById('qualquer')).rejects.toBe(error);
        });
    });

    describe('assertOriginalMatches', () => {
        it('deve aceitar conteúdo original idêntico', () => {
            const statement = original();
            expect(() =>
                useCase.assertOriginalMatches(statement, original()),
            ).not.toThrow();
        });

        it('deve ignorar a ausência do timestamp de entrada', () => {
            expect(() =>
                useCase.assertOriginalMatches(
                    original(),
                    original({ timestamp: undefined }),
                ),
            ).not.toThrow();
        });

        it('deve rejeitar timestamp informado que diverge do armazenado', () => {
            expect(() =>
                useCase.assertOriginalMatches(
                    original(),
                    original({ timestamp: '2026-11-02T10:00:00Z' }),
                ),
            ).toThrow(ConflictException);
        });

        it.each([
            'id',
            'actor',
            'verb',
            'object',
            'context',
            'result',
        ] as const)('deve rejeitar alteração no campo %s', (field) => {
            const statement = original();
            const replacements: Record<typeof field, unknown> = {
                [field]: { changed: true },
            } as Record<typeof field, unknown>;
            const changed = {
                ...statement,
                ...replacements,
            } as TXApiStatement;

            expect(() =>
                useCase.assertOriginalMatches(statement, changed),
            ).toThrow(
                'Já existe um statement xAPI com este identificador e conteúdo diferente.',
            );
        });

        it('deve normalizar objectType padrão, campos undefined e objetos aninhados', () => {
            const stored = original({
                actor: {
                    name: 'Aluno',
                    mbox: ACTOR_MBOX,
                    objectType: 'Agent',
                } as TXApiStatement['actor'],
                object: {
                    id: CHALLENGE_IRI,
                    objectType: 'Activity',
                },
                context: {
                    statement: {
                        id: 'ref-1',
                        objectType: 'StatementRef',
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
                        ],
                    },
                },
                result: {
                    extensions: {
                        'https://gamapi.dev/extensions/score': 20,
                        'https://gamapi.dev/extensions/absent': undefined,
                    },
                } as unknown as TXApiStatement['result'],
            });
            const incoming = original({
                object: { id: CHALLENGE_IRI },
                context: {
                    statement: { id: 'ref-1', objectType: 'StatementRef' },
                    contextActivities: { grouping: grouping() },
                },
            });

            expect(() =>
                useCase.assertOriginalMatches(stored, incoming),
            ).not.toThrow();
        });

        it('deve preservar objectType não padrão durante a comparação', () => {
            const changed = original({
                object: {
                    id: CHALLENGE_IRI,
                    objectType: 'CustomObject',
                } as unknown as TXApiStatement['object'],
            });

            expect(() =>
                useCase.assertOriginalMatches(original(), changed),
            ).toThrow(ConflictException);
        });

        it('deve comparar null e valores primitivos sem normalizá-los', () => {
            const stored = original({ result: undefined });
            const incoming = original({
                result: null as unknown as TXApiStatement['result'],
            });

            expect(() =>
                useCase.assertOriginalMatches(stored, incoming),
            ).toThrow(ConflictException);
        });
    });

    describe('findExistingPoints', () => {
        it('deve consultar o verbo de pontuação e retornar null sem resultados', async () => {
            await expect(
                useCase.findExistingPoints(ACTOR_MBOX, 'statement-original'),
            ).resolves.toBeNull();

            expect(gateway.getByActorAndVerb).toHaveBeenCalledWith(
                ACTOR_MBOX,
                XAPI_VERBS.EARNED_POINTS,
            );
        });

        it('deve filtrar ator, verbo e referência da conclusão', async () => {
            const valid = points();
            gateway.getByActorAndVerb.mockResolvedValue([
                points({ actor: { mbox: 'mailto:outro@email.com' } }),
                points({ verb: { id: XAPI_VERBS.COMPLETED } }),
                points({
                    context: {
                        statement: { objectType: 'StatementRef', id: 'outro' },
                    },
                }),
                points({ context: undefined }),
                valid,
            ]);

            await expect(
                useCase.findExistingPoints(ACTOR_MBOX, 'statement-original'),
            ).resolves.toBe(valid);
        });

        it('deve selecionar a recompensa mais antiga pela data', async () => {
            const newer = points({
                id: 'new',
                timestamp: '2026-11-03T00:00:00Z',
            });
            const older = points({
                id: 'old',
                timestamp: '2026-11-01T00:00:00Z',
            });
            gateway.getByActorAndVerb.mockResolvedValue([newer, older]);

            await expect(
                useCase.findExistingPoints(ACTOR_MBOX, 'statement-original'),
            ).resolves.toBe(older);
        });

        it('deve permitir ordenar recompensas sem timestamp', async () => {
            const dated = points({
                id: 'dated',
                timestamp: '2026-11-03T00:00:00Z',
            });
            const undated = points({ id: 'undated', timestamp: undefined });
            gateway.getByActorAndVerb.mockResolvedValue([dated, undated]);

            await expect(
                useCase.findExistingPoints(ACTOR_MBOX, 'statement-original'),
            ).resolves.toBe(undated);
        });

        it('deve retornar null quando todas as recompensas forem incompatíveis', async () => {
            gateway.getByActorAndVerb.mockResolvedValue([
                points({ context: undefined }),
            ]);

            await expect(
                useCase.findExistingPoints(ACTOR_MBOX, 'statement-original'),
            ).resolves.toBeNull();
        });

        it('deve propagar erro na consulta por ator e verbo', async () => {
            const error = new Error('Ralph indisponível');
            gateway.getByActorAndVerb.mockRejectedValue(error);

            await expect(
                useCase.findExistingPoints(ACTOR_MBOX, 'statement-original'),
            ).rejects.toBe(error);
        });
    });

    describe('Criação idempotente', () => {
        it.each([
            { method: 'ensureOriginal', factory: original },
            { method: 'ensurePoints', factory: points },
            { method: 'ensureBadge', factory: badge },
        ] as const)(
            'deve criar usando $method quando não existir',
            async ({ method, factory }) => {
                const statement = factory();
                const result = await useCase[method](statement);

                expect(result).toEqual({ statement, created: true });
                expect(gateway.getById).toHaveBeenCalledWith(statement.id);
                expect(gateway.create).toHaveBeenCalledWith(statement);
            },
        );

        it.each([
            { method: 'ensureOriginal', factory: original },
            { method: 'ensurePoints', factory: points },
            { method: 'ensureBadge', factory: badge },
        ] as const)(
            'deve reutilizar usando $method quando compatível',
            async ({ method, factory }) => {
                const stored = factory();
                gateway.getById.mockResolvedValue(stored);

                await expect(useCase[method](factory())).resolves.toEqual({
                    statement: stored,
                    created: false,
                });
                expect(gateway.create).not.toHaveBeenCalled();
            },
        );

        it('deve rejeitar original já existente com conteúdo diferente', async () => {
            gateway.getById.mockResolvedValue(original());

            await expect(
                useCase.ensureOriginal(original({ object: { id: 'outro' } })),
            ).rejects.toThrow(ConflictException);
            expect(gateway.create).not.toHaveBeenCalled();
        });

        it.each([
            {
                field: 'actor',
                overrides: { actor: { mbox: 'mailto:outro@email.com' } },
            },
            {
                field: 'verb',
                overrides: { verb: { id: XAPI_VERBS.COMPLETED } },
            },
            {
                field: 'object',
                overrides: { object: { id: 'https://gamapi.dev/other' } },
            },
            {
                field: 'reference',
                overrides: {
                    context: {
                        statement: {
                            objectType: 'StatementRef' as const,
                            id: 'other',
                        },
                    },
                },
            },
        ])(
            'deve rejeitar pontos existentes com $field incompatível',
            async ({ overrides }) => {
                gateway.getById.mockResolvedValue(points());

                await expect(
                    useCase.ensurePoints(points(overrides)),
                ).rejects.toThrow(
                    'O identificador da recompensa já está associado a dados incompatíveis.',
                );
                expect(gateway.create).not.toHaveBeenCalled();
            },
        );

        it('deve ignorar divergência de projeto para recompensa em pontos', async () => {
            const stored = points();
            gateway.getById.mockResolvedValue(stored);
            const incoming = points({
                context: {
                    statement: {
                        objectType: 'StatementRef',
                        id: 'statement-original',
                    },
                    contextActivities: {
                        grouping: grouping(OTHER_PROJECT_IRI),
                    },
                },
            });

            await expect(useCase.ensurePoints(incoming)).resolves.toEqual({
                statement: stored,
                created: false,
            });
        });

        it('deve aceitar pontos sem referência quando ambos não possuem referência', async () => {
            const stored = points({ context: undefined });
            gateway.getById.mockResolvedValue(stored);

            await expect(
                useCase.ensurePoints(points({ context: undefined })),
            ).resolves.toEqual({ statement: stored, created: false });
        });

        it.each([
            {
                field: 'actor',
                overrides: { actor: { mbox: 'mailto:outro@email.com' } },
            },
            {
                field: 'verb',
                overrides: { verb: { id: XAPI_VERBS.COMPLETED } },
            },
            {
                field: 'object',
                overrides: { object: { id: 'https://gamapi.dev/other' } },
            },
            {
                field: 'project',
                overrides: {
                    context: {
                        contextActivities: {
                            grouping: grouping(OTHER_PROJECT_IRI),
                        },
                    },
                },
            },
        ])(
            'deve rejeitar insígnia existente com $field incompatível',
            async ({ overrides }) => {
                gateway.getById.mockResolvedValue(badge());

                await expect(
                    useCase.ensureBadge(badge(overrides)),
                ).rejects.toThrow(ConflictException);
            },
        );

        it('deve ignorar referência de conclusão na comparação de insígnias', async () => {
            const stored = badge();
            gateway.getById.mockResolvedValue(stored);
            const incoming = badge({
                context: {
                    statement: { objectType: 'StatementRef', id: 'outro' },
                    contextActivities: { grouping: grouping() },
                },
            });

            await expect(useCase.ensureBadge(incoming)).resolves.toEqual({
                statement: stored,
                created: false,
            });
        });

        it('deve aceitar insígnias sem projeto em ambos os statements', async () => {
            const stored = badge({ context: undefined });
            gateway.getById.mockResolvedValue(stored);

            await expect(
                useCase.ensureBadge(badge({ context: undefined })),
            ).resolves.toEqual({ statement: stored, created: false });
        });

        it('deve ignorar atividades sem definição de tipo PROJECT', async () => {
            const stored = badge({
                context: { contextActivities: { grouping: [] } },
            });
            gateway.getById.mockResolvedValue(stored);
            const incoming = badge({
                context: {
                    contextActivities: {
                        grouping: [
                            {
                                id: OTHER_PROJECT_IRI,
                                definition: {
                                    type: XAPI_ACTIVITY_TYPES.CHALLENGE,
                                },
                            },
                        ],
                    },
                },
            });

            await expect(useCase.ensureBadge(incoming)).resolves.toEqual({
                statement: stored,
                created: false,
            });
        });

        it('deve propagar erro ao pesquisar statement inicial', async () => {
            const error = new Error('Consulta inicial indisponível');
            gateway.getById.mockRejectedValue(error);

            await expect(useCase.ensureOriginal(original())).rejects.toBe(
                error,
            );
            expect(gateway.create).not.toHaveBeenCalled();
        });

        it.each([
            { kind: 'erro comum', error: new Error('Falha genérica') },
            { kind: 'erro Axios não 409', error: axiosError(500) },
            { kind: 'erro Axios sem resposta', error: axiosError() },
        ])('deve propagar $kind na criação', async ({ error }) => {
            gateway.create.mockRejectedValue(error);

            await expect(useCase.ensureOriginal(original())).rejects.toBe(
                error,
            );
        });
    });

    describe('Conflitos HTTP 409 durante a criação', () => {
        it.each([
            { method: 'ensureOriginal', factory: original },
            { method: 'ensurePoints', factory: points },
            { method: 'ensureBadge', factory: badge },
        ] as const)(
            'deve recuperar usando $method após criação concorrente',
            async ({ method, factory }) => {
                const statement = factory();
                gateway.getById
                    .mockResolvedValueOnce(null)
                    .mockResolvedValueOnce(statement);
                gateway.create.mockRejectedValue(axiosError(409));

                await expect(useCase[method](factory())).resolves.toEqual({
                    statement,
                    created: false,
                });
                expect(gateway.getById).toHaveBeenCalledTimes(2);
                expect(gateway.create).toHaveBeenCalledTimes(1);
            },
        );

        it('deve verificar o conteúdo após recuperar original concorrente', async () => {
            gateway.getById
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(original());
            gateway.create.mockRejectedValue(axiosError(409));

            await expect(
                useCase.ensureOriginal(original({ object: { id: 'outro' } })),
            ).rejects.toThrow(ConflictException);
        });

        it('deve verificar o conteúdo após recuperar pontos concorrentes', async () => {
            gateway.getById
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(points());
            gateway.create.mockRejectedValue(axiosError(409));

            await expect(
                useCase.ensurePoints(points({ object: { id: 'outro' } })),
            ).rejects.toThrow(ConflictException);
        });

        it('deve verificar o conteúdo após recuperar insígnia concorrente', async () => {
            gateway.getById
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(badge());
            gateway.create.mockRejectedValue(axiosError(409));

            const incoming = badge({
                context: {
                    contextActivities: {
                        grouping: grouping(OTHER_PROJECT_IRI),
                    },
                },
            });
            await expect(useCase.ensureBadge(incoming)).rejects.toThrow(
                ConflictException,
            );
        });

        it('deve repetir a consulta até encontrar o statement', async () => {
            jest.useFakeTimers();
            const statement = original();
            gateway.getById
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(statement);
            gateway.create.mockRejectedValue(axiosError(409));

            const pending = useCase.ensureOriginal(original());
            await jest.runAllTimersAsync();

            await expect(pending).resolves.toEqual({
                statement,
                created: false,
            });
            expect(gateway.getById).toHaveBeenCalledTimes(4);
        });

        it('deve lançar ServiceUnavailableException depois das cinco tentativas', async () => {
            jest.useFakeTimers();
            gateway.create.mockRejectedValue(axiosError(409));

            const pending = useCase.ensureOriginal(original());
            const expectation = expect(pending).rejects.toThrow(
                ServiceUnavailableException,
            );
            await jest.runAllTimersAsync();
            await expectation;

            expect(gateway.getById).toHaveBeenCalledTimes(6);
        });

        it('deve propagar erro ocorrido durante a recuperação', async () => {
            const error = new Error('Falha após conflito');
            gateway.getById
                .mockResolvedValueOnce(null)
                .mockRejectedValueOnce(error);
            gateway.create.mockRejectedValue(axiosError(409));

            await expect(useCase.ensureOriginal(original())).rejects.toBe(
                error,
            );
        });
    });
});
