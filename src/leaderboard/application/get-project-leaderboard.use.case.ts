import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { ConfigurationGateway } from '../../configuration/domain/configuration.gateway';
import type { TXApiStatement } from '../../statements/domain/statements.entities';
import {
    XAPI_ACTIVITY_TYPES,
    XAPI_EXTENSIONS,
    XAPI_VERBS,
} from '../../xapi/domain/xapi.constants';

import type {
    TLeaderboardEntry,
    TProjectLeaderboard,
} from '../domain/leaderboard.entities';
import { LeaderboardGateway } from '../domain/leaderboard.gateway';

type TParticipantScore = {
    mbox: string;
    name: string;
    points: number;
};

@Injectable()
export class GetProjectLeaderboardUseCase {
    constructor(
        private readonly configurationGateway: ConfigurationGateway,
        private readonly leaderboardGateway: LeaderboardGateway,
    ) {}

    async execute(projectId: string, limit = 10): Promise<TProjectLeaderboard> {
        this.validateLeaderboardParameters(projectId, limit);

        const targetProject =
            await this.configurationGateway.findProjectById(projectId);

        if (!targetProject?.active) {
            throw new NotFoundException('Projeto não encontrado ou inativo.');
        }

        const associatedApplication =
            await this.configurationGateway.findApplicationById(
                targetProject.applicationId,
            );

        if (!associatedApplication?.active) {
            throw new NotFoundException('Aplicação não encontrada ou inativa.');
        }

        const [completedStatements, pointsRewardStatements] = await Promise.all(
            [
                this.leaderboardGateway.getByVerb(XAPI_VERBS.COMPLETED),
                this.leaderboardGateway.getByVerb(XAPI_VERBS.EARNED_POINTS),
            ],
        );

        const projectCompletedStatementsById =
            this.getProjectCompletedStatements(
                completedStatements,
                targetProject.iri,
                associatedApplication.iri,
            );

        const participantScores = this.aggregatePointsByParticipant(
            pointsRewardStatements,
            projectCompletedStatementsById,
        );

        return {
            projectId: targetProject.id,
            projectName: targetProject.name,
            leaderboard: this.buildLeaderboardEntries(participantScores, limit),
        };
    }

    private validateLeaderboardParameters(
        projectId: string,
        limit: number,
    ): void {
        if (!projectId) {
            throw new BadRequestException('Informe o projeto.');
        }

        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
            throw new BadRequestException(
                'O limite deve ser um inteiro entre 1 e 100.',
            );
        }
    }

    private getProjectCompletedStatements(
        completedStatements: TXApiStatement[],
        projectIri: string,
        applicationIri: string,
    ): Map<string, TXApiStatement> {
        const projectCompletions = completedStatements.filter(
            (statement) =>
                this.hasGroupingActivity(
                    statement,
                    XAPI_ACTIVITY_TYPES.PROJECT,
                    projectIri,
                ) &&
                this.hasGroupingActivity(
                    statement,
                    XAPI_ACTIVITY_TYPES.EDUCATIONAL_APPLICATION,
                    applicationIri,
                ),
        );

        return new Map(
            projectCompletions.map((statement) => [statement.id, statement]),
        );
    }

    private hasGroupingActivity(
        statement: TXApiStatement,
        activityType: string,
        activityIri: string,
    ): boolean {
        const groupingActivities =
            statement.context?.contextActivities?.grouping ?? [];

        return groupingActivities.some(
            (activity) =>
                activity.id === activityIri &&
                activity.definition?.type === activityType,
        );
    }

    private aggregatePointsByParticipant(
        pointsRewardStatements: TXApiStatement[],
        completedStatementsById: Map<string, TXApiStatement>,
    ): TParticipantScore[] {
        const accumulatedScoresByMbox = new Map<string, TParticipantScore>();

        for (const pointsRewardStatement of pointsRewardStatements) {
            const completionStatementId =
                pointsRewardStatement.context?.statement?.id;

            const relatedCompletion = completedStatementsById.get(
                completionStatementId ?? '',
            );

            const participantMbox = pointsRewardStatement.actor.mbox;

            const awardedPoints =
                pointsRewardStatement.result?.extensions?.[
                    XAPI_EXTENSIONS.POINTS
                ];

            if (
                !relatedCompletion ||
                relatedCompletion.actor.mbox !== participantMbox
            ) {
                continue;
            }

            if (
                typeof awardedPoints !== 'number' ||
                !Number.isFinite(awardedPoints) ||
                awardedPoints < 0
            ) {
                continue;
            }

            const previousParticipantScore =
                accumulatedScoresByMbox.get(participantMbox);

            accumulatedScoresByMbox.set(participantMbox, {
                mbox: participantMbox,
                name:
                    pointsRewardStatement.actor.name ||
                    relatedCompletion.actor.name ||
                    participantMbox,
                points: (previousParticipantScore?.points ?? 0) + awardedPoints,
            });
        }

        return [...accumulatedScoresByMbox.values()];
    }

    private buildLeaderboardEntries(
        participantScores: TParticipantScore[],
        limit: number,
    ): TLeaderboardEntry[] {
        const orderedParticipants = participantScores.sort(
            (firstParticipant, secondParticipant) =>
                secondParticipant.points - firstParticipant.points ||
                firstParticipant.mbox.localeCompare(secondParticipant.mbox),
        );

        return orderedParticipants
            .slice(0, limit)
            .map((participantScore, index) => ({
                position: index + 1,
                name: participantScore.name,
                mbox: participantScore.mbox,
                points: participantScore.points,
            }));
    }
}
