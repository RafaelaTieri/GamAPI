import type { TXApiStatement } from '../../statements/domain/statements.entities';

export abstract class BadgeStatementGateway {
    abstract getByActorAndVerb(
        mbox: string,
        verb: string,
    ): Promise<TXApiStatement[]>;

    abstract create(statement: TXApiStatement): Promise<void>;
}
