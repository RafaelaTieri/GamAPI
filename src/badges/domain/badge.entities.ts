export type TBadgeRuleType = 'POINTS_THRESHOLD' | 'CHALLENGE_COMPLETED';

export type TBadgeRuleOperator = 'ALL' | 'ANY';

export type TBadgeRule = {
    id: string;
    badgeId: string;
    type: TBadgeRuleType;
    requiredPoints: number | null;
    challengeId: string | null;
    challengeIri: string | null;
};

export type TBadge = {
    id: string;
    name: string;
    description: string;
    iri: string;
    imageUrl: string | null;
    projectId: string;
    ruleOperator: TBadgeRuleOperator;
    active: boolean;
    rules: TBadgeRule[];
};

export type TBadgeProject = {
    id: string;
    name: string;
    iri: string;
    active: boolean;
    applicationIri: string;
    applicationActive: boolean;
};

export type TCreateBadgeInput = {
    name: string;
    description: string;
    iri: string;
    imageUrl?: string | null;
    projectId: string;
    ruleOperator?: TBadgeRuleOperator;
};

export type TCreateBadgeData = {
    name: string;
    description: string;
    iri: string;
    imageUrl: string | null;
    projectId: string;
    ruleOperator: TBadgeRuleOperator;
};

export type TCreateBadgeRuleInput = {
    type: TBadgeRuleType;
    requiredPoints?: number;
    challengeId?: string;
};

export type TCreateBadgeRuleData = {
    badgeId: string;
    type: TBadgeRuleType;
    requiredPoints: number | null;
    challengeId: string | null;
};

export type TBadgeEvaluationContext = {
    totalPoints: number;
    completedChallengeIris: Set<string>;
};
