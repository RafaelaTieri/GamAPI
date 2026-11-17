import { BadRequestException, ConflictException } from '@nestjs/common';

import type { CreateBadgeUseCase } from '../../application/create-badge.use.case';
import type { CreateBadgeRuleUseCase } from '../../application/create-badge-rule.use.case';
import type { GetEarnedBadgesUseCase } from '../../application/get-earned-badges.use.case';

import type {
    TBadge,
    TBadgeRule,
    TCreateBadgeInput,
    TCreateBadgeRuleInput,
} from '../../domain/badge.entities';

import { BadgesController } from '../badges.controller';

describe('BadgesController', () => {
    let controller: BadgesController;

    let createBadgeUseCase: {
        execute: jest.Mock;
    };

    let createBadgeRuleUseCase: {
        execute: jest.Mock;
    };

    let getEarnedBadgesUseCase: {
        execute: jest.Mock;
    };

    const BADGE_ID = 'badge-1';
    const PROJECT_ID = 'project-1';
    const MBOX = 'mailto:aluno@email.com';

    const badgeInput: TCreateBadgeInput = {
        name: 'UX Master',
        description: 'Concluiu os requisitos de UX.',
        iri: 'https://gamapi.dev/badges/ux-master',
        projectId: PROJECT_ID,
        ruleOperator: 'ALL',
    };

    const createdBadge: TBadge = {
        id: BADGE_ID,
        name: badgeInput.name,
        description: badgeInput.description,
        iri: badgeInput.iri,
        imageUrl: null,
        projectId: PROJECT_ID,
        ruleOperator: 'ALL',
        active: true,
        rules: [],
    };

    const ruleInput: TCreateBadgeRuleInput = {
        type: 'POINTS_THRESHOLD',
        requiredPoints: 50,
    };

    const createdRule: TBadgeRule = {
        id: 'rule-1',
        badgeId: BADGE_ID,
        type: 'POINTS_THRESHOLD',
        requiredPoints: 50,
        challengeId: null,
        challengeIri: null,
    };

    const earnedBadgesResponse = {
        mbox: MBOX,
        total: 1,
        badges: [
            {
                badgeIri: createdBadge.iri,
                name: createdBadge.name,
                description: createdBadge.description,
                earnedAt: '2026-11-10T10:00:00Z',
                statementId: 'statement-1',
                triggerStatementId: 'completion-1',
                projectIri: 'https://gamapi.dev/projects/ux',
                applicationIri: 'https://gamapi.dev/applications/teste',
            },
        ],
    };

    beforeEach(() => {
        createBadgeUseCase = {
            execute: jest.fn().mockResolvedValue(createdBadge),
        };

        createBadgeRuleUseCase = {
            execute: jest.fn().mockResolvedValue(createdRule),
        };

        getEarnedBadgesUseCase = {
            execute: jest.fn().mockResolvedValue(earnedBadgesResponse),
        };

        controller = new BadgesController(
            createBadgeUseCase as unknown as CreateBadgeUseCase,
            createBadgeRuleUseCase as unknown as CreateBadgeRuleUseCase,
            getEarnedBadgesUseCase as unknown as GetEarnedBadgesUseCase,
        );
    });

    describe('createBadge', () => {
        it('deve encaminhar os dados ao CreateBadgeUseCase', async () => {
            const result = await controller.createBadge(badgeInput);

            expect(createBadgeUseCase.execute).toHaveBeenCalledTimes(1);
            expect(createBadgeUseCase.execute).toHaveBeenCalledWith(badgeInput);

            expect(result).toEqual(createdBadge);
        });

        it('deve retornar a insígnia criada pelo Use Case', async () => {
            const customBadge: TBadge = {
                ...createdBadge,
                id: 'badge-2',
                name: 'Especialista em UX',
            };

            createBadgeUseCase.execute.mockResolvedValue(customBadge);

            const result = await controller.createBadge(badgeInput);

            expect(result).toEqual(customBadge);
        });

        it('deve propagar erro de validação do Use Case', async () => {
            createBadgeUseCase.execute.mockRejectedValue(
                new BadRequestException('Dados da insígnia inválidos.'),
            );

            await expect(controller.createBadge(badgeInput)).rejects.toThrow(
                BadRequestException,
            );

            expect(createBadgeUseCase.execute).toHaveBeenCalledWith(badgeInput);
        });

        it('deve propagar conflito de insígnia duplicada', async () => {
            createBadgeUseCase.execute.mockRejectedValue(
                new ConflictException('Insígnia já cadastrada.'),
            );

            await expect(controller.createBadge(badgeInput)).rejects.toThrow(
                'Insígnia já cadastrada.',
            );
        });
    });

    describe('getEarnedBadges', () => {
        it('deve encaminhar o mbox ao GetEarnedBadgesUseCase', async () => {
            const result = await controller.getEarnedBadges(MBOX);

            expect(getEarnedBadgesUseCase.execute).toHaveBeenCalledTimes(1);
            expect(getEarnedBadgesUseCase.execute).toHaveBeenCalledWith(MBOX);

            expect(result).toEqual(earnedBadgesResponse);
        });

        it('deve retornar uma lista vazia quando não existem conquistas', async () => {
            const emptyResponse = {
                mbox: MBOX,
                total: 0,
                badges: [],
            };

            getEarnedBadgesUseCase.execute.mockResolvedValue(emptyResponse);

            const result = await controller.getEarnedBadges(MBOX);

            expect(result).toEqual(emptyResponse);
        });

        it('deve preservar todas as conquistas retornadas pelo Use Case', async () => {
            const multipleBadgesResponse = {
                ...earnedBadgesResponse,
                total: 2,
                badges: [
                    ...earnedBadgesResponse.badges,
                    {
                        ...earnedBadgesResponse.badges[0],
                        badgeIri: 'https://gamapi.dev/badges/advanced-ux',
                        statementId: 'statement-2',
                    },
                ],
            };

            getEarnedBadgesUseCase.execute.mockResolvedValue(
                multipleBadgesResponse,
            );

            const result = await controller.getEarnedBadges(MBOX);

            expect(result).toEqual(multipleBadgesResponse);
            expect(result.badges).toHaveLength(2);
        });

        it('deve propagar erro de mbox inválido', async () => {
            getEarnedBadgesUseCase.execute.mockRejectedValue(
                new BadRequestException('Informe um mbox válido.'),
            );

            await expect(
                controller.getEarnedBadges('mbox-invalido'),
            ).rejects.toThrow(BadRequestException);

            expect(getEarnedBadgesUseCase.execute).toHaveBeenCalledWith(
                'mbox-invalido',
            );
        });

        it('deve propagar falha na consulta de conquistas', async () => {
            getEarnedBadgesUseCase.execute.mockRejectedValue(
                new Error('Ralph indisponível.'),
            );

            await expect(controller.getEarnedBadges(MBOX)).rejects.toThrow(
                'Ralph indisponível.',
            );
        });
    });

    describe('createRule', () => {
        it('deve encaminhar o badgeId e os dados ao CreateBadgeRuleUseCase', async () => {
            const result = await controller.createRule(BADGE_ID, ruleInput);

            expect(createBadgeRuleUseCase.execute).toHaveBeenCalledTimes(1);
            expect(createBadgeRuleUseCase.execute).toHaveBeenCalledWith(
                BADGE_ID,
                ruleInput,
            );

            expect(result).toEqual(createdRule);
        });

        it('deve retornar uma regra de conclusão de desafio', async () => {
            const challengeRuleInput: TCreateBadgeRuleInput = {
                type: 'CHALLENGE_COMPLETED',
                challengeId: 'challenge-1',
            };

            const challengeRule: TBadgeRule = {
                id: 'rule-2',
                badgeId: BADGE_ID,
                type: 'CHALLENGE_COMPLETED',
                requiredPoints: null,
                challengeId: 'challenge-1',
                challengeIri: 'https://gamapi.dev/challenges/ux',
            };

            createBadgeRuleUseCase.execute.mockResolvedValue(challengeRule);

            const result = await controller.createRule(
                BADGE_ID,
                challengeRuleInput,
            );

            expect(createBadgeRuleUseCase.execute).toHaveBeenCalledWith(
                BADGE_ID,
                challengeRuleInput,
            );

            expect(result).toEqual(challengeRule);
        });

        it('deve propagar erro de regra inválida', async () => {
            createBadgeRuleUseCase.execute.mockRejectedValue(
                new BadRequestException('Pontuação da regra inválida.'),
            );

            await expect(
                controller.createRule(BADGE_ID, ruleInput),
            ).rejects.toThrow(BadRequestException);

            expect(createBadgeRuleUseCase.execute).toHaveBeenCalledWith(
                BADGE_ID,
                ruleInput,
            );
        });

        it('deve propagar conflito de regra duplicada', async () => {
            createBadgeRuleUseCase.execute.mockRejectedValue(
                new ConflictException(
                    'A insígnia já possui uma regra de pontos.',
                ),
            );

            await expect(
                controller.createRule(BADGE_ID, ruleInput),
            ).rejects.toThrow(ConflictException);
        });

        it('deve propagar erros inesperados do Use Case', async () => {
            createBadgeRuleUseCase.execute.mockRejectedValue(
                new Error('Falha ao persistir regra.'),
            );

            await expect(
                controller.createRule(BADGE_ID, ruleInput),
            ).rejects.toThrow('Falha ao persistir regra.');
        });
    });
});
