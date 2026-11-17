import type {
    TBadge,
    TBadgeEvaluationContext,
    TBadgeProject,
    TBadgeRule,
    TBadgeRuleOperator,
    TBadgeRuleType,
    TCreateBadgeData,
    TCreateBadgeInput,
    TCreateBadgeRuleData,
    TCreateBadgeRuleInput,
} from '../badge.entities';

describe('Badge Entities', () => {
    const pointsRule: TBadgeRule = {
        id: 'rule-1',
        badgeId: 'badge-1',
        type: 'POINTS_THRESHOLD',
        requiredPoints: 50,
        challengeId: null,
        challengeIri: null,
    };

    const challengeRule: TBadgeRule = {
        id: 'rule-2',
        badgeId: 'badge-1',
        type: 'CHALLENGE_COMPLETED',
        requiredPoints: null,
        challengeId: 'challenge-1',
        challengeIri: 'https://gamapi.dev/challenges/ux',
    };

    const badge: TBadge = {
        id: 'badge-1',
        name: 'UX Master',
        description: 'Insígnia de UX.',
        iri: 'https://gamapi.dev/badges/ux-master',
        imageUrl: null,
        projectId: 'project-1',
        ruleOperator: 'ALL',
        active: true,
        rules: [pointsRule, challengeRule],
    };

    it('deve permitir os dois tipos de regra definidos', () => {
        const ruleTypes: TBadgeRuleType[] = [
            'POINTS_THRESHOLD',
            'CHALLENGE_COMPLETED',
        ];

        expect(ruleTypes).toEqual(['POINTS_THRESHOLD', 'CHALLENGE_COMPLETED']);
    });

    it('deve permitir os operadores ALL e ANY', () => {
        const operators: TBadgeRuleOperator[] = ['ALL', 'ANY'];

        expect(operators).toEqual(['ALL', 'ANY']);
    });

    it('deve representar uma regra de pontuação', () => {
        expect(pointsRule.type).toBe('POINTS_THRESHOLD');
        expect(pointsRule.requiredPoints).toBe(50);
        expect(pointsRule.challengeId).toBeNull();
    });

    it('deve representar uma regra de conclusão de desafio', () => {
        expect(challengeRule.type).toBe('CHALLENGE_COMPLETED');
        expect(challengeRule.challengeId).toBe('challenge-1');
        expect(challengeRule.challengeIri).toBe(
            'https://gamapi.dev/challenges/ux',
        );
    });

    it('deve representar uma insígnia com suas regras', () => {
        expect(badge.id).toBe('badge-1');
        expect(badge.active).toBe(true);
        expect(badge.rules).toHaveLength(2);
        expect(badge.ruleOperator).toBe('ALL');
    });

    it('deve representar um projeto associado a uma aplicação', () => {
        const project: TBadgeProject = {
            id: 'project-1',
            name: 'Projeto UX',
            iri: 'https://gamapi.dev/projects/ux',
            active: true,
            applicationIri: 'https://gamapi.dev/applications/app',
            applicationActive: true,
        };

        expect(project.active).toBe(true);
        expect(project.applicationActive).toBe(true);
        expect(project.applicationIri).toContain('/applications/');
    });

    it('deve aceitar dados de criação com campos opcionais ausentes', () => {
        const input: TCreateBadgeInput = {
            name: 'UX Master',
            description: 'Insígnia de UX.',
            iri: 'https://gamapi.dev/badges/ux-master',
            projectId: 'project-1',
        };

        expect(input.imageUrl).toBeUndefined();
        expect(input.ruleOperator).toBeUndefined();
    });

    it('deve aceitar os campos opcionais na criação', () => {
        const input: TCreateBadgeInput = {
            name: 'UX Master',
            description: 'Insígnia de UX.',
            iri: 'https://gamapi.dev/badges/ux-master',
            projectId: 'project-1',
            imageUrl: 'https://gamapi.dev/images/ux.png',
            ruleOperator: 'ANY',
        };

        expect(input.imageUrl).toBe('https://gamapi.dev/images/ux.png');
        expect(input.ruleOperator).toBe('ANY');
    });

    it('deve representar os dados normalizados de criação', () => {
        const data: TCreateBadgeData = {
            name: 'UX Master',
            description: 'Insígnia de UX.',
            iri: 'https://gamapi.dev/badges/ux-master',
            imageUrl: null,
            projectId: 'project-1',
            ruleOperator: 'ALL',
        };

        expect(data.imageUrl).toBeNull();
        expect(data.ruleOperator).toBe('ALL');
    });

    it('deve aceitar entrada para regra de pontuação', () => {
        const input: TCreateBadgeRuleInput = {
            type: 'POINTS_THRESHOLD',
            requiredPoints: 50,
        };

        expect(input.type).toBe('POINTS_THRESHOLD');
        expect(input.requiredPoints).toBe(50);
        expect(input.challengeId).toBeUndefined();
    });

    it('deve aceitar entrada para regra de desafio', () => {
        const input: TCreateBadgeRuleInput = {
            type: 'CHALLENGE_COMPLETED',
            challengeId: 'challenge-1',
        };

        expect(input.type).toBe('CHALLENGE_COMPLETED');
        expect(input.challengeId).toBe('challenge-1');
        expect(input.requiredPoints).toBeUndefined();
    });

    it('deve representar os dados de persistência de uma regra', () => {
        const data: TCreateBadgeRuleData = {
            badgeId: 'badge-1',
            type: 'POINTS_THRESHOLD',
            requiredPoints: 50,
            challengeId: null,
        };

        expect(data).toEqual({
            badgeId: 'badge-1',
            type: 'POINTS_THRESHOLD',
            requiredPoints: 50,
            challengeId: null,
        });
    });

    it('deve representar o contexto de avaliação de insígnias', () => {
        const context: TBadgeEvaluationContext = {
            totalPoints: 100,
            completedChallengeIris: new Set([
                'https://gamapi.dev/challenges/ux',
            ]),
        };

        expect(context.totalPoints).toBe(100);
        expect(
            context.completedChallengeIris.has(
                'https://gamapi.dev/challenges/ux',
            ),
        ).toBe(true);
    });

    it('deve permitir contexto sem desafios concluídos', () => {
        const context: TBadgeEvaluationContext = {
            totalPoints: 0,
            completedChallengeIris: new Set<string>(),
        };

        expect(context.totalPoints).toBe(0);
        expect(context.completedChallengeIris.size).toBe(0);
    });
});
