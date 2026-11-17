import type { TXApiStatement } from '../../statements/domain/statements.entities';

export abstract class LeaderboardGateway {
    abstract getByVerb(verb: string): Promise<TXApiStatement[]>;
}
