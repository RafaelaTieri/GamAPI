import type {
    TBadge,
    TBadgeEvaluationContext,
    TBadgeRule,
} from '../../domain/badge.entities';
import { EvaluateBadgeRulesUseCase } from '../evaluate-badge-rules.use.case';

describe('EvaluateBadgeRulesUseCase', () => {
    let useCase: EvaluateBadgeRulesUseCase;

    const pointsRule: TBadgeRule = {
        id: 'points-rule',
        badgeId: 'badge-1',
        type: 'POINTS_THRESHOLD',
        requiredPoints: 50,
        challengeId: null,
        challengeIri: null,
    };

    const challengeRule: TBadgeRule = {
        id: 'challenge-rule',
        badgeId: 'badge-1',
        type: 'CHALLENGE_COMPLETED',
        requiredPoints: null,
        challengeId: 'challenge-1',
        challengeIri: 'https://gamapi.dev/challenges/testes-de-ux',
    };

    const createBadge = (overrides: Partial<TBadge> = {}): TBadge => ({
        id: 'badge-1',
        name: 'UX Master',
        description: 'Concluiu os requisitos de UX.',
        iri: 'https://gamapi.dev/badges/ux-master',
        imageUrl: null,
        projectId: 'project-1',
        ruleOperator: 'ALL',
        active: true,
        rules: [pointsRule, challengeRule],
        ...overrides,
    });

    const createContext = (
        overrides: Partial<TBadgeEvaluationContext> = {},
    ): TBadgeEvaluationContext => ({
        totalPoints: 50,
        completedChallengeIris: new Set([
            'https://gamapi.dev/challenges/testes-de-ux',
        ]),
        ...overrides,
    });

    beforeEach(() => {
        useCase = new EvaluateBadgeRulesUseCase();
    });

    describe('Validação da insígnia', () => {
        it('deve retornar false para insígnia inativa', () => {
            const badge = createBadge({ active: false });

            expect(useCase.execute(badge, createContext())).toBe(false);
        });

        it('deve retornar false para insígnia sem regras', () => {
            const badge = createBadge({ rules: [] });

            expect(useCase.execute(badge, createContext())).toBe(false);
        });

        it('deve retornar false para operador inválido', () => {
            const badge = createBadge({
                ruleOperator: 'INVALID' as TBadge['ruleOperator'],
            });

            expect(useCase.execute(badge, createContext())).toBe(false);
        });
    });

    describe('Regra POINTS_THRESHOLD', () => {
        const badge = createBadge({
            rules: [pointsRule],
        });

        it('deve aceitar pontuação igual ao mínimo exigido', () => {
            const context = createContext({
                totalPoints: 50,
            });

            expect(useCase.execute(badge, context)).toBe(true);
        });

        it('deve aceitar pontuação acima do mínimo exigido', () => {
            const context = createContext({
                totalPoints: 100,
            });

            expect(useCase.execute(badge, context)).toBe(true);
        });

        it('deve rejeitar pontuação abaixo do mínimo exigido', () => {
            const context = createContext({
                totalPoints: 49,
            });

            expect(useCase.execute(badge, context)).toBe(false);
        });

        it('deve rejeitar regra sem pontuação obrigatória', () => {
            const invalidPointsRule: TBadgeRule = {
                ...pointsRule,
                requiredPoints: null,
            };

            const badgeWithoutThreshold = createBadge({
                rules: [invalidPointsRule],
            });

            expect(
                useCase.execute(badgeWithoutThreshold, createContext()),
            ).toBe(false);
        });
    });

    describe('Regra CHALLENGE_COMPLETED', () => {
        const badge = createBadge({
            rules: [challengeRule],
        });

        it('deve aceitar desafio concluído', () => {
            expect(useCase.execute(badge, createContext())).toBe(true);
        });

        it('deve rejeitar desafio não concluído', () => {
            const context = createContext({
                completedChallengeIris: new Set(),
            });

            expect(useCase.execute(badge, context)).toBe(false);
        });

        it('deve rejeitar regra sem IRI do desafio', () => {
            const invalidChallengeRule: TBadgeRule = {
                ...challengeRule,
                challengeIri: null,
            };

            const badgeWithoutChallengeIri = createBadge({
                rules: [invalidChallengeRule],
            });

            expect(
                useCase.execute(badgeWithoutChallengeIri, createContext()),
            ).toBe(false);
        });
    });

    describe('Operador ALL', () => {
        const badge = createBadge({
            ruleOperator: 'ALL',
        });

        it('deve retornar true quando todas as regras forem atendidas', () => {
            expect(useCase.execute(badge, createContext())).toBe(true);
        });

        it('deve retornar false quando a pontuação for insuficiente', () => {
            const context = createContext({
                totalPoints: 20,
            });

            expect(useCase.execute(badge, context)).toBe(false);
        });

        it('deve retornar false quando faltar um desafio', () => {
            const context = createContext({
                completedChallengeIris: new Set(),
            });

            expect(useCase.execute(badge, context)).toBe(false);
        });
    });

    describe('Operador ANY', () => {
        const badge = createBadge({
            ruleOperator: 'ANY',
        });

        it('deve aceitar quando somente a pontuação for suficiente', () => {
            const context = createContext({
                totalPoints: 50,
                completedChallengeIris: new Set(),
            });

            expect(useCase.execute(badge, context)).toBe(true);
        });

        it('deve aceitar quando somente o desafio estiver concluído', () => {
            const context = createContext({
                totalPoints: 10,
            });

            expect(useCase.execute(badge, context)).toBe(true);
        });

        it('deve rejeitar quando nenhuma regra for atendida', () => {
            const context = createContext({
                totalPoints: 10,
                completedChallengeIris: new Set(),
            });

            expect(useCase.execute(badge, context)).toBe(false);
        });

        it('deve aceitar quando ambas as regras forem atendidas', () => {
            expect(useCase.execute(badge, createContext())).toBe(true);
        });
    });

    describe('Tipos de regra inválidos', () => {
        it('deve retornar false para um tipo de regra desconhecido', () => {
            const invalidRule: TBadgeRule = {
                ...pointsRule,
                type: 'INVALID' as TBadgeRule['type'],
            };

            const badge = createBadge({
                rules: [invalidRule],
            });

            expect(useCase.execute(badge, createContext())).toBe(false);
        });
    });
});
