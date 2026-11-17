import type { TChallenge } from './challenge.entities';

export type TGetChallengeByContext = {
    challengeIri: string;
    projectIri: string;
    applicationIri: string;
};

export abstract class ChallengeGateway {
    abstract getByContext(
        params: TGetChallengeByContext,
    ): Promise<TChallenge | null>;
}
