import { TXApiStatement, TXApiStatementResult } from './statements.entities';

export abstract class StatementGateway {
    abstract create(statement: TXApiStatement): Promise<TXApiStatement>;
    abstract getById(id: string): Promise<TXApiStatement>;
    abstract getPointsByActor(mbox: string): Promise<TXApiStatementResult>;
    abstract getAllStatementsByActor(
        mbox: string,
    ): Promise<TXApiStatementResult>;
}
