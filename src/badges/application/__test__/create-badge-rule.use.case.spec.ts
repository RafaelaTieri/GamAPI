import {
    BadRequestException,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';

import type {
    TBadge,
    TBadgeRule,
    TCreateBadgeRuleData,
    TCreateBadgeRuleInput,
} from '../../domain/badge.entities';
import { BadgeGateway } from '../../domain/badge.gateway';
import { CreateBadgeRuleUseCase } from '../create-badge-rule.use.case';

describe('CreateBadgeRuleUseCase', () => {
    let useCase: CreateBadgeRuleUseCase;

    let gateway: {
        findById: jest.Mock;
        findChallengeById: jest.Mock;
        isChallengeLinkedToProject: jest.Mock;
        createRule: jest.Mock;
    };

    const BADGE_ID = 'badge-1';
    const PROJECT_ID = 'project-1';
    const CHALLENGE_ID = 'challenge-1';
    const CHALLENGE_IRI = 'https://gamapi.dev/challenges/testes-de-ux';

    const createBadge = (overrides: Partial<TBadge> = {}): TBadge => ({
        id: BADGE_ID,
        name: 'UX Master',
        description: 'Concluiu os requisitos de UX.',
        iri: 'https://gamapi.dev/badges/ux-master',
        imageUrl: null,
        projectId: PROJECT_ID,
        ruleOperator: 'ALL',
        active: true,
        rules: [],
        ...overrides,
    });

    const pointsRule: TBadgeRule = {
        id: 'rule-points',
        badgeId: BADGE_ID,
        type: 'POINTS_THRESHOLD',
        requiredPoints: 50,
        challengeId: null,
        challengeIri: null,
    };

    const challengeRule: TBadgeRule = {
        id: 'rule-challenge',
        badgeId: BADGE_ID,
        type: 'CHALLENGE_COMPLETED',
        requiredPoints: null,
        challengeId: CHALLENGE_ID,
        challengeIri: CHALLENGE_IRI,
    };

    const pointsInput: TCreateBadgeRuleInput = {
        type: 'POINTS_THRESHOLD',
        requiredPoints: 50,
    };

    const challengeInput: TCreateBadgeRuleInput = {
        type: 'CHALLENGE_COMPLETED',
        challengeId: CHALLENGE_ID,
    };

    beforeEach(() => {
        gateway = {
            findById: jest.fn().mockResolvedValue(createBadge()),
            findChallengeById: jest.fn().mockResolvedValue({
                id: CHALLENGE_ID,
                active: true,
            }),
            isChallengeLinkedToProject: jest.fn().mockResolvedValue(true),
            createRule: jest
                .fn()
                .mockImplementation(
                    (ruleData: TCreateBadgeRuleData): Promise<TBadgeRule> =>
                        Promise.resolve({
                            id: 'new-rule',
                            ...ruleData,
                            challengeIri:
                                ruleData.type === 'CHALLENGE_COMPLETED'
                                    ? CHALLENGE_IRI
                                    : null,
                        }),
                ),
        };

        useCase = new CreateBadgeRuleUseCase(
            gateway as unknown as BadgeGateway,
        );
    });

    describe('Validação da insígnia', () => {
        it.each([null, undefined, 123])(
            'deve rejeitar identificador que não é string: %p',
            async (invalidBadgeId) => {
                await expect(
                    useCase.execute(
                        invalidBadgeId as unknown as string,
                        pointsInput,
                    ),
                ).rejects.toThrow(BadRequestException);

                expect(gateway.findById).not.toHaveBeenCalled();
            },
        );

        it.each(['', ' ', '   '])(
            'deve rejeitar identificador vazio: %p',
            async (invalidBadgeId) => {
                await expect(
                    useCase.execute(invalidBadgeId, pointsInput),
                ).rejects.toThrow('Informe a insígnia.');

                expect(gateway.findById).not.toHaveBeenCalled();
            },
        );

        it('deve rejeitar insígnia inexistente', async () => {
            gateway.findById.mockResolvedValue(null);

            await expect(
                useCase.execute(BADGE_ID, pointsInput),
            ).rejects.toThrow(NotFoundException);

            expect(gateway.findById).toHaveBeenCalledWith(BADGE_ID);
            expect(gateway.createRule).not.toHaveBeenCalled();
        });

        it('deve rejeitar insígnia inativa', async () => {
            gateway.findById.mockResolvedValue(createBadge({ active: false }));

            await expect(
                useCase.execute(BADGE_ID, pointsInput),
            ).rejects.toThrow('Insígnia não encontrada ou inativa.');

            expect(gateway.createRule).not.toHaveBeenCalled();
        });

        it('deve consultar a insígnia pelo identificador recebido', async () => {
            await useCase.execute(BADGE_ID, pointsInput);

            expect(gateway.findById).toHaveBeenCalledTimes(1);
            expect(gateway.findById).toHaveBeenCalledWith(BADGE_ID);
        });
    });

    describe('Validação do tipo de regra', () => {
        it.each([null, undefined])(
            'deve rejeitar ausência dos dados da regra: %p',
            async (invalidInput) => {
                await expect(
                    useCase.execute(
                        BADGE_ID,
                        invalidInput as unknown as TCreateBadgeRuleInput,
                    ),
                ).rejects.toThrow('Informe o tipo da regra.');

                expect(gateway.createRule).not.toHaveBeenCalled();
            },
        );

        it('deve rejeitar objeto sem o tipo da regra', async () => {
            await expect(
                useCase.execute(BADGE_ID, {} as TCreateBadgeRuleInput),
            ).rejects.toThrow('Informe o tipo da regra.');

            expect(gateway.createRule).not.toHaveBeenCalled();
        });

        it('deve rejeitar tipo de regra desconhecido', async () => {
            const invalidInput = {
                type: 'INVALID',
            } as unknown as TCreateBadgeRuleInput;

            await expect(
                useCase.execute(BADGE_ID, invalidInput),
            ).rejects.toThrow('Tipo de regra inválido.');

            expect(gateway.createRule).not.toHaveBeenCalled();
        });
    });

    describe('Regra POINTS_THRESHOLD', () => {
        it('deve cadastrar uma regra de pontuação válida', async () => {
            const result = await useCase.execute(BADGE_ID, pointsInput);

            expect(result).toEqual({
                id: 'new-rule',
                badgeId: BADGE_ID,
                type: 'POINTS_THRESHOLD',
                requiredPoints: 50,
                challengeId: null,
                challengeIri: null,
            });

            expect(gateway.createRule).toHaveBeenCalledWith({
                badgeId: BADGE_ID,
                type: 'POINTS_THRESHOLD',
                requiredPoints: 50,
                challengeId: null,
            });

            expect(gateway.createRule).toHaveBeenCalledTimes(1);
        });

        it('deve aceitar pontuação positiva igual a 1', async () => {
            await useCase.execute(BADGE_ID, {
                type: 'POINTS_THRESHOLD',
                requiredPoints: 1,
            });

            expect(gateway.createRule).toHaveBeenCalledWith(
                expect.objectContaining({
                    requiredPoints: 1,
                }),
            );
        });

        it.each([undefined, null, '50', 1.5, NaN])(
            'deve rejeitar pontuação não inteira: %p',
            async (invalidPoints) => {
                const invalidInput = {
                    type: 'POINTS_THRESHOLD',
                    requiredPoints: invalidPoints,
                } as unknown as TCreateBadgeRuleInput;

                await expect(
                    useCase.execute(BADGE_ID, invalidInput),
                ).rejects.toThrow('Pontuação da regra inválida.');

                expect(gateway.createRule).not.toHaveBeenCalled();
            },
        );

        it.each([0, -1, -50])(
            'deve rejeitar pontuação menor ou igual a zero: %p',
            async (invalidPoints) => {
                await expect(
                    useCase.execute(BADGE_ID, {
                        type: 'POINTS_THRESHOLD',
                        requiredPoints: invalidPoints,
                    }),
                ).rejects.toThrow(BadRequestException);

                expect(gateway.createRule).not.toHaveBeenCalled();
            },
        );

        it('deve rejeitar regra de pontos que também informa um desafio', async () => {
            const invalidInput: TCreateBadgeRuleInput = {
                type: 'POINTS_THRESHOLD',
                requiredPoints: 50,
                challengeId: CHALLENGE_ID,
            };

            await expect(
                useCase.execute(BADGE_ID, invalidInput),
            ).rejects.toThrow('Pontuação da regra inválida.');

            expect(gateway.createRule).not.toHaveBeenCalled();
        });

        it('deve aceitar challengeId igual a null', async () => {
            const input = {
                ...pointsInput,
                challengeId: null,
            } as unknown as TCreateBadgeRuleInput;

            await useCase.execute(BADGE_ID, input);

            expect(gateway.createRule).toHaveBeenCalledTimes(1);
        });

        it('deve rejeitar regra de pontos duplicada', async () => {
            gateway.findById.mockResolvedValue(
                createBadge({
                    rules: [pointsRule],
                }),
            );

            await expect(
                useCase.execute(BADGE_ID, pointsInput),
            ).rejects.toThrow(ConflictException);

            expect(gateway.createRule).not.toHaveBeenCalled();
        });

        it('deve permitir uma regra de pontos quando só existe regra de desafio', async () => {
            gateway.findById.mockResolvedValue(
                createBadge({
                    rules: [challengeRule],
                }),
            );

            const result = await useCase.execute(BADGE_ID, pointsInput);

            expect(result.type).toBe('POINTS_THRESHOLD');
            expect(gateway.createRule).toHaveBeenCalledTimes(1);
        });

        it('deve propagar falha do gateway na criação da regra de pontos', async () => {
            gateway.createRule.mockRejectedValue(
                new Error('Falha no banco de dados.'),
            );

            await expect(
                useCase.execute(BADGE_ID, pointsInput),
            ).rejects.toThrow('Falha no banco de dados.');
        });
    });

    describe('Regra CHALLENGE_COMPLETED', () => {
        it('deve cadastrar uma regra de desafio válida', async () => {
            const result = await useCase.execute(BADGE_ID, challengeInput);

            expect(result).toEqual({
                id: 'new-rule',
                badgeId: BADGE_ID,
                type: 'CHALLENGE_COMPLETED',
                requiredPoints: null,
                challengeId: CHALLENGE_ID,
                challengeIri: CHALLENGE_IRI,
            });

            expect(gateway.findChallengeById).toHaveBeenCalledWith(
                CHALLENGE_ID,
            );

            expect(gateway.isChallengeLinkedToProject).toHaveBeenCalledWith(
                PROJECT_ID,
                CHALLENGE_ID,
            );

            expect(gateway.createRule).toHaveBeenCalledWith({
                badgeId: BADGE_ID,
                type: 'CHALLENGE_COMPLETED',
                requiredPoints: null,
                challengeId: CHALLENGE_ID,
            });
        });

        it.each([undefined, null, 123])(
            'deve rejeitar challengeId que não é string: %p',
            async (invalidChallengeId) => {
                const invalidInput = {
                    type: 'CHALLENGE_COMPLETED',
                    challengeId: invalidChallengeId,
                } as unknown as TCreateBadgeRuleInput;

                await expect(
                    useCase.execute(BADGE_ID, invalidInput),
                ).rejects.toThrow('Desafio informado na regra é inválido.');

                expect(gateway.findChallengeById).not.toHaveBeenCalled();
            },
        );

        it.each(['', ' ', '   '])(
            'deve rejeitar challengeId vazio: %p',
            async (invalidChallengeId) => {
                await expect(
                    useCase.execute(BADGE_ID, {
                        type: 'CHALLENGE_COMPLETED',
                        challengeId: invalidChallengeId,
                    }),
                ).rejects.toThrow(BadRequestException);

                expect(gateway.findChallengeById).not.toHaveBeenCalled();
            },
        );

        it.each([0, 10, -5])(
            'deve rejeitar regra de desafio com requiredPoints: %p',
            async (requiredPoints) => {
                await expect(
                    useCase.execute(BADGE_ID, {
                        ...challengeInput,
                        requiredPoints,
                    }),
                ).rejects.toThrow('Desafio informado na regra é inválido.');

                expect(gateway.createRule).not.toHaveBeenCalled();
            },
        );

        it('deve aceitar requiredPoints igual a null', async () => {
            const input = {
                ...challengeInput,
                requiredPoints: null,
            } as unknown as TCreateBadgeRuleInput;

            const result = await useCase.execute(BADGE_ID, input);

            expect(result.type).toBe('CHALLENGE_COMPLETED');
            expect(gateway.createRule).toHaveBeenCalledTimes(1);
        });

        it('deve rejeitar desafio inexistente', async () => {
            gateway.findChallengeById.mockResolvedValue(null);

            await expect(
                useCase.execute(BADGE_ID, challengeInput),
            ).rejects.toThrow(NotFoundException);

            expect(gateway.isChallengeLinkedToProject).not.toHaveBeenCalled();

            expect(gateway.createRule).not.toHaveBeenCalled();
        });

        it('deve rejeitar desafio inativo', async () => {
            gateway.findChallengeById.mockResolvedValue({
                id: CHALLENGE_ID,
                active: false,
            });

            await expect(
                useCase.execute(BADGE_ID, challengeInput),
            ).rejects.toThrow('Desafio não encontrado ou inativo.');

            expect(gateway.createRule).not.toHaveBeenCalled();
        });

        it('deve rejeitar desafio não associado ao projeto', async () => {
            gateway.isChallengeLinkedToProject.mockResolvedValue(false);

            await expect(
                useCase.execute(BADGE_ID, challengeInput),
            ).rejects.toThrow('Desafio não associado ao projeto da insígnia.');

            expect(gateway.isChallengeLinkedToProject).toHaveBeenCalledWith(
                PROJECT_ID,
                CHALLENGE_ID,
            );

            expect(gateway.createRule).not.toHaveBeenCalled();
        });

        it('deve rejeitar regra duplicada para o mesmo desafio', async () => {
            gateway.findById.mockResolvedValue(
                createBadge({
                    rules: [challengeRule],
                }),
            );

            await expect(
                useCase.execute(BADGE_ID, challengeInput),
            ).rejects.toThrow('Esse desafio já é requisito da insígnia.');

            expect(gateway.createRule).not.toHaveBeenCalled();
        });

        it('deve permitir uma regra para outro desafio', async () => {
            gateway.findById.mockResolvedValue(
                createBadge({
                    rules: [
                        {
                            ...challengeRule,
                            challengeId: 'challenge-2',
                        },
                    ],
                }),
            );

            const result = await useCase.execute(BADGE_ID, challengeInput);

            expect(result.type).toBe('CHALLENGE_COMPLETED');
            expect(gateway.createRule).toHaveBeenCalledTimes(1);
        });

        it('deve permitir regra de desafio quando existe uma regra de pontos', async () => {
            gateway.findById.mockResolvedValue(
                createBadge({
                    rules: [pointsRule],
                }),
            );

            const result = await useCase.execute(BADGE_ID, challengeInput);

            expect(result.type).toBe('CHALLENGE_COMPLETED');
        });

        it('deve propagar falha do gateway na criação da regra de desafio', async () => {
            gateway.createRule.mockRejectedValue(
                new Error('Erro ao persistir a regra.'),
            );

            await expect(
                useCase.execute(BADGE_ID, challengeInput),
            ).rejects.toThrow('Erro ao persistir a regra.');
        });
    });

    describe('Validação defensiva de pontuação', () => {
        it('deve rejeitar valor que se torna indefinido durante a leitura', async () => {
            let accessCount = 0;

            const dynamicInput: TCreateBadgeRuleInput = {
                type: 'POINTS_THRESHOLD',
                get requiredPoints() {
                    accessCount += 1;

                    return accessCount === 1 ? 50 : undefined;
                },
            };

            await expect(
                useCase.execute(BADGE_ID, dynamicInput),
            ).rejects.toThrow('Pontuação da regra inválida.');

            expect(gateway.createRule).not.toHaveBeenCalled();
        });
    });
});
