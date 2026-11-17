import type { TXApiStatement } from '../../statements/domain/statements.entities';

export abstract class StatementIdempotencyGateway {
    abstract getById(id: string): Promise<TXApiStatement | null>;

    abstract getByActorAndVerb(
        mbox: string,
        verb: string,
    ): Promise<TXApiStatement[]>;

    abstract create(statement: TXApiStatement): Promise<void>;
}
