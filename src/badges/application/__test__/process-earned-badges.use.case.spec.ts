import type {
    TXApiActivity,
    TXApiStatement,
} from '../../../statements/domain/statements.entities';
import {
    XAPI_ACTIVITY_TYPES,
    XAPI_EXTENSIONS,
    XAPI_VERBS,
} from '../../../xapi/domain/xapi.constants';
import type { TBadge, TBadgeProject } from '../../domain/badge.entities';
import { BadgeGateway } from '../../domain/badge.gateway';
import { BadgeStatementGateway } from '../../domain/badge-statement.gateway';
import { AwardBadgeUseCase } from '../award-badge.use.case';
import { EvaluateBadgeRulesUseCase } from '../evaluate-badge-rules.use.case';
import { ProcessEarnedBadgesUseCase } from '../process-earned-badges.use.case';

describe('ProcessEarnedBadgesUseCase', () => {
    const mbox = 'mailto:aluna@exemplo.com';
    const projectIri = 'https://gamapi.dev/projects/ux';
    const applicationIri = 'https://gamapi.dev/applications/app';
    const challengeIri = 'https://gamapi.dev/challenges/ux';

    const project: TBadgeProject = {
        id: 'project-1',
        name: 'Projeto UX',
        iri: projectIri,
        active: true,
        applicationIri,
        applicationActive: true,
    };

    const badge: TBadge = {
        id: 'badge-1',
        name: 'UX Master',
        description: 'Conquistou a insígnia UX Master.',
        iri: 'https://gamapi.dev/badges/ux-master',
        imageUrl: null,
        projectId: project.id,
        ruleOperator: 'ALL',
        active: true,
        rules: [],
    };

    const grouping = (
        selectedProject = projectIri,
        selectedApplication = applicationIri,
    ): TXApiActivity[] => [
        {
            id: selectedProject,
            definition: { type: XAPI_ACTIVITY_TYPES.PROJECT },
        },
        {
            id: selectedApplication,
            definition: {
                type: XAPI_ACTIVITY_TYPES.EDUCATIONAL_APPLICATION,
            },
        },
    ];

    const completion = (
        id = 'completion-current',
        challenge = challengeIri,
        activities: TXApiActivity[] = grouping(),
    ): TXApiStatement => ({
        id,
        actor: { mbox, name: 'Aluna' },
        verb: { id: XAPI_VERBS.COMPLETED },
        object: { id: challenge },
        context: { contextActivities: { grouping: activities } },
    });

    const points = (
        id = 'points-current',
        completedId = 'completion-current',
        amount: number | string | boolean = 40,
    ): TXApiStatement => ({
        id,
        actor: { mbox },
        verb: { id: XAPI_VERBS.EARNED_POINTS },
        object: { id: 'https://gamapi.dev/points' },
        context: {
            statement: { objectType: 'StatementRef', id: completedId },
        },
        result: { extensions: { [XAPI_EXTENSIONS.POINTS]: amount } },
    });

    const earnedBadge = (
        id = 'earned-old',
        activities = grouping(),
    ): TXApiStatement => ({
        id,
        actor: { mbox },
        verb: { id: XAPI_VERBS.EARNED_BADGE },
        object: { id: badge.iri },
        context: { contextActivities: { grouping: activities } },
    });

    let useCase: ProcessEarnedBadgesUseCase;
    let badgeGateway: {
        findProjectByIri: jest.Mock;
        findActiveByProjectId: jest.Mock;
    };
    let statementGateway: { getByActorAndVerb: jest.Mock };
    let evaluateRules: { execute: jest.Mock };
    let awardBadge: { execute: jest.Mock };
    let history: {
        completions: TXApiStatement[];
        rewards: TXApiStatement[];
        awards: TXApiStatement[];
    };

    beforeEach(() => {
        history = { completions: [], rewards: [], awards: [] };
        badgeGateway = {
            findProjectByIri: jest.fn().mockResolvedValue(project),
            findActiveByProjectId: jest.fn().mockResolvedValue([badge]),
        };
        statementGateway = {
            getByActorAndVerb: jest
                .fn()
                .mockImplementation(
                    (
                        _mbox: string,
                        verb: string,
                    ): Promise<TXApiStatement[]> => {
                        if (verb === XAPI_VERBS.COMPLETED)
                            return Promise.resolve(history.completions);
                        if (verb === XAPI_VERBS.EARNED_POINTS)
                            return Promise.resolve(history.rewards);
                        if (verb === XAPI_VERBS.EARNED_BADGE)
                            return Promise.resolve(history.awards);
                        return Promise.resolve([]);
                    },
                ),
        };
        evaluateRules = { execute: jest.fn().mockReturnValue(true) };
        awardBadge = {
            execute: jest.fn().mockResolvedValue(earnedBadge('earned-new')),
        };
        useCase = new ProcessEarnedBadgesUseCase(
            badgeGateway as unknown as BadgeGateway,
            statementGateway as unknown as BadgeStatementGateway,
            evaluateRules as unknown as EvaluateBadgeRulesUseCase,
            awardBadge as unknown as AwardBadgeUseCase,
        );
    });

    it.each([
        ['sem contexto', { ...completion(), context: undefined }],
        ['sem contextActivities', { ...completion(), context: {} }],
        [
            'sem grouping',
            { ...completion(), context: { contextActivities: {} } },
        ],
        [
            'sem projeto',
            completion('current', challengeIri, grouping().slice(1)),
        ],
        [
            'sem aplicação',
            completion('current', challengeIri, grouping().slice(0, 1)),
        ],
        ['sem nenhuma atividade', completion('current', challengeIri, [])],
        [
            'sem definição das atividades',
            completion('current', challengeIri, [{ id: projectIri }]),
        ],
        [
            'com ID vazio do projeto',
            completion('current', challengeIri, grouping('', applicationIri)),
        ],
        [
            'com ID vazio da aplicação',
            completion('current', challengeIri, grouping(projectIri, '')),
        ],
    ])('ignora conclusão %s', async (_caseName, original) => {
        expect(await useCase.execute(original, points())).toEqual([]);
        expect(badgeGateway.findProjectByIri).not.toHaveBeenCalled();
        expect(statementGateway.getByActorAndVerb).not.toHaveBeenCalled();
    });

    it.each([
        ['inexistente', null],
        ['inativo', { ...project, active: false }],
        ['com aplicação inativa', { ...project, applicationActive: false }],
        ['com aplicação divergente', { ...project, applicationIri: 'outra' }],
    ])('ignora projeto %s', async (_caseName, foundProject) => {
        badgeGateway.findProjectByIri.mockResolvedValue(foundProject);
        expect(await useCase.execute(completion(), points())).toEqual([]);
        expect(badgeGateway.findActiveByProjectId).not.toHaveBeenCalled();
    });

    it('não consulta o histórico quando não existem insígnias ativas', async () => {
        badgeGateway.findActiveByProjectId.mockResolvedValue([]);
        expect(await useCase.execute(completion(), points())).toEqual([]);
        expect(statementGateway.getByActorAndVerb).not.toHaveBeenCalled();
    });

    it('consulta os três históricos e considera a conclusão e os pontos atuais', async () => {
        const awarded = await useCase.execute(completion(), points());
        expect(awarded).toEqual([earnedBadge('earned-new')]);
        for (const verb of [
            XAPI_VERBS.COMPLETED,
            XAPI_VERBS.EARNED_POINTS,
            XAPI_VERBS.EARNED_BADGE,
        ]) {
            expect(statementGateway.getByActorAndVerb).toHaveBeenCalledWith(
                mbox,
                verb,
            );
        }
        expect(evaluateRules.execute).toHaveBeenCalledWith(badge, {
            totalPoints: 40,
            completedChallengeIris: new Set([challengeIri]),
        });
    });

    it('mescla o histórico, soma apenas pontos do projeto e remove IDs repetidos', async () => {
        history.completions = [
            completion('completion-old', 'https://gamapi.dev/challenges/old'),
            completion(
                'completion-current',
                'https://gamapi.dev/challenges/obsolete',
            ),
            completion(
                'completion-other',
                'https://gamapi.dev/challenges/other',
                grouping('outro-projeto'),
            ),
            completion(
                'completion-other-app',
                'https://gamapi.dev/challenges/app',
                grouping(projectIri, 'outra-app'),
            ),
        ];
        history.rewards = [
            points('reward-old', 'completion-old', 20),
            points('points-current', 'completion-current', 999),
            points('reward-other', 'completion-other', 500),
            points('reward-other-app', 'completion-other-app', 500),
        ];
        await useCase.execute(completion(), points());
        expect(evaluateRules.execute).toHaveBeenCalledWith(badge, {
            totalPoints: 60,
            completedChallengeIris: new Set([
                'https://gamapi.dev/challenges/old',
                challengeIri,
            ]),
        });
    });

    it('ignora recompensas sem referência, sem resultado ou com pontos inválidos', async () => {
        history.rewards = [
            points('orphan', 'missing', 900),
            { ...points('no-context'), context: undefined },
            { ...points('no-ref'), context: {} },
            points('empty-ref', '', 20),
            { ...points('no-result'), result: undefined },
            { ...points('no-extensions'), result: {} },
            { ...points('no-points'), result: { extensions: {} } },
            points('string-points', 'completion-current', '50'),
            points('nan-points', 'completion-current', NaN),
            points('infinite-points', 'completion-current', Infinity),
            points('negative-points', 'completion-current', -1),
            points('zero-points', 'completion-current', 0),
        ];
        await useCase.execute(completion(), points());
        expect(evaluateRules.execute).toHaveBeenCalledWith(
            badge,
            expect.objectContaining({ totalPoints: 40 }),
        );
    });

    it('permite zero pontos quando o desafio foi concluído', async () => {
        await useCase.execute(
            completion(),
            points('points-current', 'completion-current', 0),
        );
        expect(evaluateRules.execute).toHaveBeenCalledWith(badge, {
            totalPoints: 0,
            completedChallengeIris: new Set([challengeIri]),
        });
    });

    it('considera apenas insígnias conquistadas neste projeto e aplicação', async () => {
        history.awards = [
            earnedBadge(),
            earnedBadge('other-project', grouping('outro-projeto')),
            earnedBadge('other-app', grouping(projectIri, 'outra-app')),
            { ...earnedBadge('no-context'), context: undefined },
        ];
        await useCase.execute(completion(), points());
        expect(awardBadge.execute).toHaveBeenCalledWith(
            badge,
            expect.objectContaining({ id: 'completion-current' }),
            new Set([badge.iri]),
        );
    });

    it('ignora regras não satisfeitas e concessões que retornam null', async () => {
        const secondBadge = {
            ...badge,
            id: 'badge-2',
            iri: 'https://gamapi.dev/badges/other',
        };
        badgeGateway.findActiveByProjectId.mockResolvedValue([
            badge,
            secondBadge,
        ]);
        evaluateRules.execute
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true);
        awardBadge.execute.mockResolvedValueOnce(null);
        expect(await useCase.execute(completion(), points())).toEqual([]);
        expect(awardBadge.execute).toHaveBeenCalledTimes(1);
        expect(awardBadge.execute).toHaveBeenCalledWith(
            secondBadge,
            expect.anything(),
            new Set(),
        );
    });

    it('retorna as concessões de todas as insígnias elegíveis', async () => {
        const secondBadge = {
            ...badge,
            id: 'badge-2',
            iri: 'https://gamapi.dev/badges/other',
        };
        badgeGateway.findActiveByProjectId.mockResolvedValue([
            badge,
            secondBadge,
        ]);
        awardBadge.execute
            .mockResolvedValueOnce(earnedBadge('award-1'))
            .mockResolvedValueOnce(earnedBadge('award-2'));
        const result = await useCase.execute(completion(), points());
        expect(result.map((statement) => statement.id)).toEqual([
            'award-1',
            'award-2',
        ]);
    });

    it.each([
        ['projeto', 'findProjectByIri'],
        ['insígnias', 'findActiveByProjectId'],
    ] as const)('propaga erro na consulta de %s', async (_name, method) => {
        badgeGateway[method].mockRejectedValue(new Error('Falha no gateway'));
        await expect(useCase.execute(completion(), points())).rejects.toThrow(
            'Falha no gateway',
        );
    });

    it('propaga falha na consulta do histórico', async () => {
        statementGateway.getByActorAndVerb.mockRejectedValue(
            new Error('Ralph indisponível'),
        );
        await expect(useCase.execute(completion(), points())).rejects.toThrow(
            'Ralph indisponível',
        );
        expect(awardBadge.execute).not.toHaveBeenCalled();
    });

    it('propaga falha na avaliação das regras', async () => {
        evaluateRules.execute.mockImplementation(() => {
            throw new Error('Erro de avaliação');
        });
        await expect(useCase.execute(completion(), points())).rejects.toThrow(
            'Erro de avaliação',
        );
        expect(awardBadge.execute).not.toHaveBeenCalled();
    });

    it('propaga falha na concessão', async () => {
        awardBadge.execute.mockRejectedValue(new Error('Erro de concessão'));
        await expect(useCase.execute(completion(), points())).rejects.toThrow(
            'Erro de concessão',
        );
    });
});
