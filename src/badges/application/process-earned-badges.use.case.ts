import { Injectable } from '@nestjs/common';

import type { TXApiStatement } from '../../statements/domain/statements.entities';
import {
    XAPI_ACTIVITY_TYPES,
    XAPI_EXTENSIONS,
    XAPI_VERBS,
} from '../../xapi/domain/xapi.constants';

import type {
    TBadgeEvaluationContext,
    TBadgeProject,
} from '../domain/badge.entities';
import { BadgeStatementGateway } from '../domain/badge-statement.gateway';
import { BadgeGateway } from '../domain/badge.gateway';

import { AwardBadgeUseCase } from './award-badge.use.case';
import { EvaluateBadgeRulesUseCase } from './evaluate-badge-rules.use.case';

type TBadgeHistory = {
    completedStatements: TXApiStatement[];
    pointsRewardStatements: TXApiStatement[];
    badgeAwardStatements: TXApiStatement[];
};

@Injectable()
export class ProcessEarnedBadgesUseCase {
    constructor(
        private readonly badgeGateway: BadgeGateway,
        private readonly statementGateway: BadgeStatementGateway,
        private readonly evaluateRules: EvaluateBadgeRulesUseCase,
        private readonly awardBadge: AwardBadgeUseCase,
    ) {}

    async execute(
        originalStatement: TXApiStatement,
        pointsRewardStatement: TXApiStatement,
    ): Promise<TXApiStatement[]> {
        const project =
            await this.getActiveProjectFromStatement(originalStatement);

        if (!project) {
            return [];
        }

        const projectBadges = await this.badgeGateway.findActiveByProjectId(
            project.id,
        );

        if (projectBadges.length === 0) {
            return [];
        }

        const participantHistory = await this.loadParticipantHistory(
            originalStatement.actor.mbox,
        );

        const allCompletedStatements = this.mergeStatementsById(
            participantHistory.completedStatements,
            originalStatement,
        );

        const projectCompletedStatements = allCompletedStatements.filter(
            (statement) => this.belongsToProject(statement, project),
        );

        const pointsRewardStatements = this.mergeStatementsById(
            participantHistory.pointsRewardStatements,
            pointsRewardStatement,
        );

        const evaluationContext = this.buildEvaluationContext(
            projectCompletedStatements,
            pointsRewardStatements,
        );

        const earnedBadgeIris = this.getEarnedBadgeIris(
            participantHistory.badgeAwardStatements,
            project,
        );

        const awardedBadgeStatements: TXApiStatement[] = [];

        for (const badge of projectBadges) {
            if (!this.evaluateRules.execute(badge, evaluationContext)) {
                continue;
            }

            const awardedStatement = await this.awardBadge.execute(
                badge,
                originalStatement,
                earnedBadgeIris,
            );

            if (awardedStatement) {
                awardedBadgeStatements.push(awardedStatement);
            }
        }

        return awardedBadgeStatements;
    }

    private mergeStatementsById(
        statements: TXApiStatement[],
        currentStatement: TXApiStatement,
    ): TXApiStatement[] {
        const uniqueStatementsById = new Map(
            statements.map((statement) => [statement.id, statement]),
        );

        uniqueStatementsById.set(currentStatement.id, currentStatement);

        return [...uniqueStatementsById.values()];
    }

    private async getActiveProjectFromStatement(
        statement: TXApiStatement,
    ): Promise<TBadgeProject | null> {
        const projectIri = this.getContextIri(
            statement,
            XAPI_ACTIVITY_TYPES.PROJECT,
        );

        const applicationIri = this.getContextIri(
            statement,
            XAPI_ACTIVITY_TYPES.EDUCATIONAL_APPLICATION,
        );

        if (!projectIri || !applicationIri) {
            return null;
        }

        const project = await this.badgeGateway.findProjectByIri(projectIri);

        if (
            !project?.active ||
            !project.applicationActive ||
            project.applicationIri !== applicationIri
        ) {
            return null;
        }

        return project;
    }

    private async loadParticipantHistory(
        actorMbox: string,
    ): Promise<TBadgeHistory> {
        const [
            completedStatements,
            pointsRewardStatements,
            badgeAwardStatements,
        ] = await Promise.all([
            this.statementGateway.getByActorAndVerb(
                actorMbox,
                XAPI_VERBS.COMPLETED,
            ),
            this.statementGateway.getByActorAndVerb(
                actorMbox,
                XAPI_VERBS.EARNED_POINTS,
            ),
            this.statementGateway.getByActorAndVerb(
                actorMbox,
                XAPI_VERBS.EARNED_BADGE,
            ),
        ]);

        return {
            completedStatements,
            pointsRewardStatements,
            badgeAwardStatements,
        };
    }

    private buildEvaluationContext(
        completedStatements: TXApiStatement[],
        pointsRewardStatements: TXApiStatement[],
    ): TBadgeEvaluationContext {
        const completedStatementIds = new Set(
            completedStatements.map((statement) => statement.id),
        );

        const totalPoints = pointsRewardStatements.reduce(
            (accumulatedPoints, pointsReward) => {
                const completedStatementId =
                    pointsReward.context?.statement?.id;

                const rewardPoints =
                    pointsReward.result?.extensions?.[XAPI_EXTENSIONS.POINTS];

                if (
                    !completedStatementId ||
                    !completedStatementIds.has(completedStatementId) ||
                    typeof rewardPoints !== 'number' ||
                    !Number.isFinite(rewardPoints) ||
                    rewardPoints < 0
                ) {
                    return accumulatedPoints;
                }

                return accumulatedPoints + rewardPoints;
            },
            0,
        );

        return {
            totalPoints,
            completedChallengeIris: new Set(
                completedStatements.map((statement) => statement.object.id),
            ),
        };
    }

    private getEarnedBadgeIris(
        badgeAwardStatements: TXApiStatement[],
        project: TBadgeProject,
    ): Set<string> {
        return new Set(
            badgeAwardStatements
                .filter((statement) =>
                    this.belongsToProject(statement, project),
                )
                .map((statement) => statement.object.id),
        );
    }

    private belongsToProject(
        statement: TXApiStatement,
        project: TBadgeProject,
    ): boolean {
        return (
            this.getContextIri(statement, XAPI_ACTIVITY_TYPES.PROJECT) ===
                project.iri &&
            this.getContextIri(
                statement,
                XAPI_ACTIVITY_TYPES.EDUCATIONAL_APPLICATION,
            ) === project.applicationIri
        );
    }

    private getContextIri(
        statement: TXApiStatement,
        activityType: string,
    ): string | null {
        const groupingActivities =
            statement.context?.contextActivities?.grouping ?? [];

        const matchingActivity = groupingActivities.find(
            (activity) => activity.definition?.type === activityType,
        );

        return matchingActivity?.id ?? null;
    }
}
