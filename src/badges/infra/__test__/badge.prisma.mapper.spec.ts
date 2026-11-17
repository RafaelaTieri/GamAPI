import { mapBadge } from '../badge.prisma.mapper';

describe('mapBadge', () => {
    type TStoredBadge = Parameters<typeof mapBadge>[0];

    const createStoredBadge = (
        overrides: Partial<TStoredBadge> = {},
    ): TStoredBadge => ({
        id: 'badge-1',
        name: 'UX Master',
        description: 'Concluiu os requisitos de UX.',
        iri: 'https://gamapi.dev/badges/ux-master',
        imageUrl: null,
        projectId: 'project-1',
        ruleOperator: 'ALL',
        active: true,
        rules: [],
        ...overrides,
    });

    it('deve mapear todos os campos da insígnia', () => {
        const storedBadge = createStoredBadge();

        expect(mapBadge(storedBadge)).toEqual({
            id: 'badge-1',
            name: 'UX Master',
            description: 'Concluiu os requisitos de UX.',
            iri: 'https://gamapi.dev/badges/ux-master',
            imageUrl: null,
            projectId: 'project-1',
            ruleOperator: 'ALL',
            active: true,
            rules: [],
        });
    });

    it('deve mapear uma regra de pontuação sem desafio', () => {
        const storedBadge = createStoredBadge({
            rules: [
                {
                    id: 'rule-1',
                    badgeId: 'badge-1',
                    type: 'POINTS_THRESHOLD',
                    requiredPoints: 50,
                    challengeId: null,
                    challenge: null,
                },
            ],
        });

        expect(mapBadge(storedBadge).rules).toEqual([
            {
                id: 'rule-1',
                badgeId: 'badge-1',
                type: 'POINTS_THRESHOLD',
                requiredPoints: 50,
                challengeId: null,
                challengeIri: null,
            },
        ]);
    });

    it('deve mapear uma regra de conclusão de desafio com sua IRI', () => {
        const storedBadge = createStoredBadge({
            rules: [
                {
                    id: 'rule-2',
                    badgeId: 'badge-1',
                    type: 'CHALLENGE_COMPLETED',
                    requiredPoints: null,
                    challengeId: 'challenge-1',
                    challenge: {
                        iri: 'https://gamapi.dev/challenges/ux',
                    },
                },
            ],
        });

        expect(mapBadge(storedBadge).rules).toEqual([
            {
                id: 'rule-2',
                badgeId: 'badge-1',
                type: 'CHALLENGE_COMPLETED',
                requiredPoints: null,
                challengeId: 'challenge-1',
                challengeIri: 'https://gamapi.dev/challenges/ux',
            },
        ]);
    });

    it('deve mapear múltiplas regras na mesma insígnia', () => {
        const storedBadge = createStoredBadge({
            rules: [
                {
                    id: 'rule-1',
                    badgeId: 'badge-1',
                    type: 'POINTS_THRESHOLD',
                    requiredPoints: 100,
                    challengeId: null,
                    challenge: null,
                },
                {
                    id: 'rule-2',
                    badgeId: 'badge-1',
                    type: 'CHALLENGE_COMPLETED',
                    requiredPoints: null,
                    challengeId: 'challenge-1',
                    challenge: {
                        iri: 'https://gamapi.dev/challenges/ux',
                    },
                },
            ],
        });

        const result = mapBadge(storedBadge);

        expect(result.rules).toHaveLength(2);
        expect(result.rules[0].challengeIri).toBeNull();
        expect(result.rules[1].challengeIri).toBe(
            'https://gamapi.dev/challenges/ux',
        );
    });

    it('deve preservar uma insígnia inativa com operador ANY', () => {
        const storedBadge = createStoredBadge({
            active: false,
            ruleOperator: 'ANY',
            imageUrl: 'https://gamapi.dev/images/ux-master.png',
        });

        const result = mapBadge(storedBadge);

        expect(result.active).toBe(false);
        expect(result.ruleOperator).toBe('ANY');
        expect(result.imageUrl).toBe('https://gamapi.dev/images/ux-master.png');
    });

    it('deve retornar um novo objeto sem modificar os dados originais', () => {
        const storedBadge = createStoredBadge({
            rules: [
                {
                    id: 'rule-1',
                    badgeId: 'badge-1',
                    type: 'POINTS_THRESHOLD',
                    requiredPoints: 50,
                    challengeId: null,
                    challenge: null,
                },
            ],
        });

        const result = mapBadge(storedBadge);

        expect(result).not.toBe(storedBadge);
        expect(result.rules).not.toBe(storedBadge.rules);
        expect(result.rules[0]).not.toBe(storedBadge.rules[0]);

        expect(storedBadge.rules[0].challenge).toBeNull();
    });
});
