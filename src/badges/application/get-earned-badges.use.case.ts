import { BadRequestException, Injectable } from '@nestjs/common';

import type { TXApiStatement } from '../../statements/domain/statements.entities';
import {
    XAPI_ACTIVITY_TYPES,
    XAPI_VERBS,
} from '../../xapi/domain/xapi.constants';
import { BadgeStatementGateway } from '../domain/badge-statement.gateway';

type TEarnedBadge = {
    badgeIri: string;
    name: string | null;
    description: string | null;
    earnedAt: string | null;
    statementId: string;
    triggerStatementId: string | null;
    projectIri: string | null;
    applicationIri: string | null;
};

type TGetEarnedBadgesResponse = {
    mbox: string;
    total: number;
    badges: TEarnedBadge[];
};

@Injectable()
export class GetEarnedBadgesUseCase {
    constructor(
        private readonly badgeStatementGateway: BadgeStatementGateway,
    ) {}

    async execute(mbox: string): Promise<TGetEarnedBadgesResponse> {
        const normalizedMbox = mbox?.trim();

        if (!/^mailto:[^\s@]+@[^\s@]+$/.test(normalizedMbox ?? '')) {
            throw new BadRequestException('Informe um mbox válido.');
        }

        const earnedBadgeStatements =
            await this.badgeStatementGateway.getByActorAndVerb(
                normalizedMbox,
                XAPI_VERBS.EARNED_BADGE,
            );

        const earnedBadgesByKey = new Map<string, TEarnedBadge>();

        for (const badgeStatement of earnedBadgeStatements) {
            if (badgeStatement.verb.id !== XAPI_VERBS.EARNED_BADGE) {
                continue;
            }

            const earnedBadge = this.mapEarnedBadgeStatement(badgeStatement);

            const badgeKey = JSON.stringify([
                earnedBadge.projectIri,
                earnedBadge.badgeIri,
            ]);

            const previouslyRecordedBadge = earnedBadgesByKey.get(badgeKey);

            if (
                !previouslyRecordedBadge ||
                this.wasEarnedEarlier(earnedBadge, previouslyRecordedBadge)
            ) {
                earnedBadgesByKey.set(badgeKey, earnedBadge);
            }
        }

        const earnedBadges = [...earnedBadgesByKey.values()].sort(
            (firstBadge, secondBadge) =>
                (secondBadge.earnedAt ?? '').localeCompare(
                    firstBadge.earnedAt ?? '',
                ),
        );

        return {
            mbox: normalizedMbox,
            total: earnedBadges.length,
            badges: earnedBadges,
        };
    }

    private mapEarnedBadgeStatement(
        badgeStatement: TXApiStatement,
    ): TEarnedBadge {
        const groupingActivities =
            badgeStatement.context?.contextActivities?.grouping ?? [];

        const projectActivity = groupingActivities.find(
            (activity) =>
                activity.definition?.type === XAPI_ACTIVITY_TYPES.PROJECT,
        );

        const applicationActivity = groupingActivities.find(
            (activity) =>
                activity.definition?.type ===
                XAPI_ACTIVITY_TYPES.EDUCATIONAL_APPLICATION,
        );

        return {
            badgeIri: badgeStatement.object.id,
            name: this.getLocalizedText(badgeStatement.object.definition?.name),
            description: this.getLocalizedText(
                badgeStatement.object.definition?.description,
            ),
            earnedAt: badgeStatement.timestamp ?? null,
            statementId: badgeStatement.id,
            triggerStatementId: badgeStatement.context?.statement?.id ?? null,
            projectIri: projectActivity?.id ?? null,
            applicationIri: applicationActivity?.id ?? null,
        };
    }

    private getLocalizedText(
        localizedValues?: Record<string, string>,
    ): string | null {
        if (!localizedValues) {
            return null;
        }

        return (
            localizedValues['pt-BR'] ??
            localizedValues['en-US'] ??
            Object.values(localizedValues)[0] ??
            null
        );
    }

    private wasEarnedEarlier(
        currentBadge: TEarnedBadge,
        previouslyRecordedBadge: TEarnedBadge,
    ): boolean {
        if (!currentBadge.earnedAt) {
            return false;
        }

        return (
            !previouslyRecordedBadge.earnedAt ||
            currentBadge.earnedAt < previouslyRecordedBadge.earnedAt
        );
    }
}
