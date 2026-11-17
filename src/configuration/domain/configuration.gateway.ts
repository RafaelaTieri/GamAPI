import type {
    TChallenge,
    TCreateChallenge,
} from '../../challenges/domain/challenge.entities';

import type {
    TApplication,
    TCreateApplication,
    TCreateProject,
    TProject,
} from './configuration.entities';

export abstract class ConfigurationGateway {
    abstract findApplicationById(id: string): Promise<TApplication | null>;
    abstract findApplicationByIri(iri: string): Promise<TApplication | null>;

    abstract findProjectById(id: string): Promise<TProject | null>;
    abstract findProjectByIri(iri: string): Promise<TProject | null>;

    abstract findChallengeById(id: string): Promise<TChallenge | null>;
    abstract findChallengeByIri(iri: string): Promise<TChallenge | null>;

    abstract createApplication(
        params: TCreateApplication,
    ): Promise<TApplication>;
    abstract createProject(params: TCreateProject): Promise<TProject>;
    abstract createChallenge(params: TCreateChallenge): Promise<TChallenge>;

    abstract addChallengeToProject(
        projectId: string,
        challengeId: string,
    ): Promise<void>;

    abstract updateChallengePoints(
        id: string,
        points: number,
    ): Promise<TChallenge>;
}
