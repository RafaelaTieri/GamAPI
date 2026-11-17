import { Injectable } from '@nestjs/common';

import type {
    TBadge,
    TBadgeEvaluationContext,
    TBadgeRule,
} from '../domain/badge.entities';

@Injectable()
export class EvaluateBadgeRulesUseCase {
    execute(
        badgeToEvaluate: TBadge,
        evaluationContext: TBadgeEvaluationContext,
    ): boolean {
        if (!badgeToEvaluate.active || badgeToEvaluate.rules.length === 0) {
            return false;
        }

        const ruleEvaluationResults = badgeToEvaluate.rules.map((badgeRule) =>
            this.isRuleSatisfied(badgeRule, evaluationContext),
        );

        if (badgeToEvaluate.ruleOperator === 'ALL') {
            return ruleEvaluationResults.every(Boolean);
        }

        if (badgeToEvaluate.ruleOperator === 'ANY') {
            return ruleEvaluationResults.some(Boolean);
        }

        return false;
    }

    private isRuleSatisfied(
        badgeRule: TBadgeRule,
        evaluationContext: TBadgeEvaluationContext,
    ): boolean {
        if (badgeRule.type === 'POINTS_THRESHOLD') {
            return (
                badgeRule.requiredPoints !== null &&
                evaluationContext.totalPoints >= badgeRule.requiredPoints
            );
        }

        if (badgeRule.type === 'CHALLENGE_COMPLETED') {
            return (
                badgeRule.challengeIri !== null &&
                evaluationContext.completedChallengeIris.has(
                    badgeRule.challengeIri,
                )
            );
        }

        return false;
    }
}
