import type {
    TBadge,
    TBadgeProject,
    TBadgeRule,
    TCreateBadgeData,
    TCreateBadgeRuleData,
} from '../badge.entities';
import { BadgeGateway } from '../badge.gateway';

describe('BadgeGateway', () => {
    const PROJECT_ID = 'project-1';
    const PROJECT_IRI = 'https://gamapi.dev/projects/ux';
    const BADGE_ID = 'badge-1';
    const BADGE_IRI = 'https://gamapi.dev/badges/ux-master';
    const CHALLENGE_ID = 'challenge-1';
    const CHALLENGE_IRI = 'https://gamapi.dev/challenges/ux';

    const createProject = (): TBadgeProject => ({
        id: PROJECT_ID,
        name: 'Projeto UX',
        iri: PROJECT_IRI,
        active: true,
        applicationIri: 'https://gamapi.dev/applications/teste',
        applicationActive: true,
    });

    const createBadge = (overrides: Partial<TBadge> = {}): TBadge => ({
        id: BADGE_ID,
        name: 'UX Master',
        description: 'Concluiu os requisitos de UX.',
        iri: BADGE_IRI,
        imageUrl: null,
        projectId: PROJECT_ID,
        ruleOperator: 'ALL',
        active: true,
        rules: [],
        ...overrides,
    });

    class InMemoryBadgeGateway extends BadgeGateway {
        private readonly projects: TBadgeProject[] = [createProject()];

        private readonly badges: TBadge[] = [
            createBadge(),
            createBadge({
                id: 'badge-inactive',
                iri: 'https://gamapi.dev/badges/inactive',
                active: false,
            }),
        ];

        private readonly challenges = [
            { id: CHALLENGE_ID, active: true },
            { id: 'challenge-inactive', active: false },
        ];

        private readonly projectChallengeLinks = new Set([
            `${PROJECT_ID}:${CHALLENGE_ID}`,
        ]);

        findProjectById(id: string): Promise<TBadgeProject | null> {
            return Promise.resolve(
                this.projects.find((project) => project.id === id) ?? null,
            );
        }

        findProjectByIri(iri: string): Promise<TBadgeProject | null> {
            return Promise.resolve(
                this.projects.find((project) => project.iri === iri) ?? null,
            );
        }

        findById(id: string): Promise<TBadge | null> {
            return Promise.resolve(
                this.badges.find((badge) => badge.id === id) ?? null,
            );
        }

        findByIri(iri: string): Promise<TBadge | null> {
            return Promise.resolve(
                this.badges.find((badge) => badge.iri === iri) ?? null,
            );
        }

        findActiveByProjectId(projectId: string): Promise<TBadge[]> {
            return Promise.resolve(
                this.badges.filter(
                    (badge) => badge.projectId === projectId && badge.active,
                ),
            );
        }

        findChallengeById(
            id: string,
        ): Promise<{ id: string; active: boolean } | null> {
            return Promise.resolve(
                this.challenges.find((challenge) => challenge.id === id) ??
                    null,
            );
        }

        isChallengeLinkedToProject(
            projectId: string,
            challengeId: string,
        ): Promise<boolean> {
            return Promise.resolve(
                this.projectChallengeLinks.has(`${projectId}:${challengeId}`),
            );
        }

        createBadge(params: TCreateBadgeData): Promise<TBadge> {
            const createdBadge: TBadge = {
                id: `badge-${this.badges.length + 1}`,
                ...params,
                active: true,
                rules: [],
            };

            this.badges.push(createdBadge);

            return Promise.resolve(createdBadge);
        }

        createRule(params: TCreateBadgeRuleData): Promise<TBadgeRule> {
            const targetBadge = this.badges.find(
                (badge) => badge.id === params.badgeId,
            );

            const createdRule: TBadgeRule = {
                id: `rule-${(targetBadge?.rules.length ?? 0) + 1}`,
                ...params,
                challengeIri: params.challengeId ? CHALLENGE_IRI : null,
            };

            targetBadge?.rules.push(createdRule);

            return Promise.resolve(createdRule);
        }
    }

    let gateway: BadgeGateway;

    beforeEach(() => {
        gateway = new InMemoryBadgeGateway();
    });

    describe('Contrato abstrato', () => {
        it('deve permitir uma implementação concreta do gateway', () => {
            expect(gateway).toBeInstanceOf(BadgeGateway);
        });

        it('deve disponibilizar todos os métodos do contrato', () => {
            expect(gateway).toHaveProperty('findProjectById');
            expect(gateway).toHaveProperty('findProjectByIri');
            expect(gateway).toHaveProperty('findById');
            expect(gateway).toHaveProperty('findByIri');
            expect(gateway).toHaveProperty('findActiveByProjectId');
            expect(gateway).toHaveProperty('findChallengeById');
            expect(gateway).toHaveProperty('isChallengeLinkedToProject');
            expect(gateway).toHaveProperty('createBadge');
            expect(gateway).toHaveProperty('createRule');
        });
    });

    describe('Consulta de projetos', () => {
        it('deve consultar um projeto pelo ID', async () => {
            const result = await gateway.findProjectById(PROJECT_ID);

            expect(result).toEqual(createProject());
        });

        it('deve retornar null para ID de projeto inexistente', async () => {
            const result = await gateway.findProjectById('project-inexistente');

            expect(result).toBeNull();
        });

        it('deve consultar um projeto pela IRI', async () => {
            const result = await gateway.findProjectByIri(PROJECT_IRI);

            expect(result).toEqual(createProject());
        });

        it('deve retornar null para IRI de projeto inexistente', async () => {
            const result = await gateway.findProjectByIri(
                'https://gamapi.dev/projects/inexistente',
            );

            expect(result).toBeNull();
        });
    });

    describe('Consulta de insígnias', () => {
        it('deve consultar uma insígnia pelo ID', async () => {
            const result = await gateway.findById(BADGE_ID);

            expect(result).toEqual(createBadge());
        });

        it('deve retornar null quando o ID da insígnia não existe', async () => {
            const result = await gateway.findById('badge-inexistente');

            expect(result).toBeNull();
        });

        it('deve consultar uma insígnia pela IRI', async () => {
            const result = await gateway.findByIri(BADGE_IRI);

            expect(result).toEqual(createBadge());
        });

        it('deve retornar null quando a IRI não existe', async () => {
            const result = await gateway.findByIri(
                'https://gamapi.dev/badges/inexistente',
            );

            expect(result).toBeNull();
        });

        it('deve retornar apenas insígnias ativas do projeto', async () => {
            const result = await gateway.findActiveByProjectId(PROJECT_ID);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(BADGE_ID);
            expect(result[0].active).toBe(true);
        });

        it('deve retornar lista vazia para projeto sem insígnias', async () => {
            const result =
                await gateway.findActiveByProjectId('project-sem-badges');

            expect(result).toEqual([]);
        });
    });

    describe('Consulta de desafios', () => {
        it('deve consultar um desafio ativo', async () => {
            const result = await gateway.findChallengeById(CHALLENGE_ID);

            expect(result).toEqual({
                id: CHALLENGE_ID,
                active: true,
            });
        });

        it('deve retornar um desafio inativo', async () => {
            const result =
                await gateway.findChallengeById('challenge-inactive');

            expect(result).toEqual({
                id: 'challenge-inactive',
                active: false,
            });
        });

        it('deve retornar null para desafio inexistente', async () => {
            const result = await gateway.findChallengeById(
                'challenge-inexistente',
            );

            expect(result).toBeNull();
        });

        it('deve identificar desafio associado ao projeto', async () => {
            const result = await gateway.isChallengeLinkedToProject(
                PROJECT_ID,
                CHALLENGE_ID,
            );

            expect(result).toBe(true);
        });

        it('deve identificar desafio não associado ao projeto', async () => {
            const result = await gateway.isChallengeLinkedToProject(
                PROJECT_ID,
                'challenge-inactive',
            );

            expect(result).toBe(false);
        });

        it('deve considerar o projeto na associação', async () => {
            const result = await gateway.isChallengeLinkedToProject(
                'outro-projeto',
                CHALLENGE_ID,
            );

            expect(result).toBe(false);
        });
    });

    describe('Criação de insígnias', () => {
        it('deve permitir criar uma insígnia', async () => {
            const input: TCreateBadgeData = {
                name: 'Especialista em UX',
                description: 'Concluiu desafios avançados.',
                iri: 'https://gamapi.dev/badges/especialista-ux',
                imageUrl: null,
                projectId: PROJECT_ID,
                ruleOperator: 'ANY',
            };

            const result = await gateway.createBadge(input);

            expect(result).toEqual({
                id: 'badge-3',
                ...input,
                active: true,
                rules: [],
            });
        });

        it('deve permitir consultar uma insígnia após criá-la', async () => {
            const input: TCreateBadgeData = {
                name: 'Nova Insígnia',
                description: 'Insígnia de teste.',
                iri: 'https://gamapi.dev/badges/nova',
                imageUrl: null,
                projectId: PROJECT_ID,
                ruleOperator: 'ALL',
            };

            const createdBadge = await gateway.createBadge(input);
            const foundBadge = await gateway.findById(createdBadge.id);

            expect(foundBadge).toEqual(createdBadge);
        });

        it('deve incluir uma nova insígnia ativa na consulta do projeto', async () => {
            await gateway.createBadge({
                name: 'Nova Insígnia',
                description: 'Insígnia de teste.',
                iri: 'https://gamapi.dev/badges/nova',
                imageUrl: null,
                projectId: PROJECT_ID,
                ruleOperator: 'ALL',
            });

            const result = await gateway.findActiveByProjectId(PROJECT_ID);

            expect(result).toHaveLength(2);
        });
    });

    describe('Criação de regras', () => {
        it('deve permitir criar uma regra de pontuação', async () => {
            const input: TCreateBadgeRuleData = {
                badgeId: BADGE_ID,
                type: 'POINTS_THRESHOLD',
                requiredPoints: 50,
                challengeId: null,
            };

            const result = await gateway.createRule(input);

            expect(result).toEqual({
                id: 'rule-1',
                ...input,
                challengeIri: null,
            });
        });

        it('deve permitir criar uma regra de conclusão de desafio', async () => {
            const input: TCreateBadgeRuleData = {
                badgeId: BADGE_ID,
                type: 'CHALLENGE_COMPLETED',
                requiredPoints: null,
                challengeId: CHALLENGE_ID,
            };

            const result = await gateway.createRule(input);

            expect(result).toEqual({
                id: 'rule-1',
                ...input,
                challengeIri: CHALLENGE_IRI,
            });
        });

        it('deve associar a regra criada à insígnia', async () => {
            const createdRule = await gateway.createRule({
                badgeId: BADGE_ID,
                type: 'POINTS_THRESHOLD',
                requiredPoints: 100,
                challengeId: null,
            });

            const foundBadge = await gateway.findById(BADGE_ID);

            expect(foundBadge?.rules).toContainEqual(createdRule);
        });

        it('deve permitir múltiplas regras na mesma insígnia', async () => {
            await gateway.createRule({
                badgeId: BADGE_ID,
                type: 'POINTS_THRESHOLD',
                requiredPoints: 50,
                challengeId: null,
            });

            await gateway.createRule({
                badgeId: BADGE_ID,
                type: 'CHALLENGE_COMPLETED',
                requiredPoints: null,
                challengeId: CHALLENGE_ID,
            });

            const foundBadge = await gateway.findById(BADGE_ID);

            expect(foundBadge?.rules).toHaveLength(2);
        });

        it('deve retornar a regra mesmo quando a insígnia não existe na implementação em memória', async () => {
            const result = await gateway.createRule({
                badgeId: 'badge-inexistente',
                type: 'POINTS_THRESHOLD',
                requiredPoints: 10,
                challengeId: null,
            });

            expect(result.id).toBe('rule-1');
            expect(result.badgeId).toBe('badge-inexistente');
        });
    });
});
