import type {
    TBadge,
    TBadgeProject,
    TBadgeRule,
    TCreateBadgeData,
    TCreateBadgeRuleData,
} from './badge.entities';

export abstract class BadgeGateway {
    abstract findProjectById(id: string): Promise<TBadgeProject | null>;

    abstract findProjectByIri(iri: string): Promise<TBadgeProject | null>;

    abstract findById(id: string): Promise<TBadge | null>;

    abstract findByIri(iri: string): Promise<TBadge | null>;

    abstract findActiveByProjectId(projectId: string): Promise<TBadge[]>;

    abstract findChallengeById(
        id: string,
    ): Promise<{ id: string; active: boolean } | null>;

    abstract isChallengeLinkedToProject(
        projectId: string,
        challengeId: string,
    ): Promise<boolean>;

    abstract createBadge(params: TCreateBadgeData): Promise<TBadge>;

    abstract createRule(params: TCreateBadgeRuleData): Promise<TBadgeRule>;
}
