import type {
    TBadge,
    TBadgeRuleOperator,
    TBadgeRuleType,
} from '../domain/badge.entities';

type TStoredBadge = {
    id: string;
    name: string;
    description: string;
    iri: string;
    imageUrl: string | null;
    projectId: string;
    ruleOperator: TBadgeRuleOperator;
    active: boolean;
    rules: {
        id: string;
        badgeId: string;
        type: TBadgeRuleType;
        requiredPoints: number | null;
        challengeId: string | null;
        challenge: { iri: string } | null;
    }[];
};

export const mapBadge = (badge: TStoredBadge): TBadge => ({
    id: badge.id,
    name: badge.name,
    description: badge.description,
    iri: badge.iri,
    imageUrl: badge.imageUrl,
    projectId: badge.projectId,
    ruleOperator: badge.ruleOperator,
    active: badge.active,
    rules: badge.rules.map((rule) => ({
        id: rule.id,
        badgeId: rule.badgeId,
        type: rule.type,
        requiredPoints: rule.requiredPoints,
        challengeId: rule.challengeId,
        challengeIri: rule.challenge?.iri ?? null,
    })),
});
