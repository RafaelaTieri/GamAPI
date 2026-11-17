import type { TXApiStatement } from '../../../statements/domain/statements.entities';
import { XAPI_VERBS } from '../../../xapi/domain/xapi.constants';
import { StatementIdempotencyGateway } from '../statement-idempotency.gateway';

describe('StatementIdempotencyGateway', () => {
    const MBOX = 'mailto:aluno@email.com';

    const statement = (
        id: string,
        actorMbox: string = MBOX,
        verb: string = XAPI_VERBS.COMPLETED,
    ): TXApiStatement => ({
        id,
        actor: { mbox: actorMbox },
        verb: { id: verb },
        object: { id: 'https://gamapi.dev/challenges/ux' },
    });

    class InMemoryStatementIdempotencyGateway extends StatementIdempotencyGateway {
        private readonly statements = new Map<string, TXApiStatement>();

        getById(id: string): Promise<TXApiStatement | null> {
            return Promise.resolve(this.statements.get(id) ?? null);
        }

        getByActorAndVerb(
            mbox: string,
            verb: string,
        ): Promise<TXApiStatement[]> {
            return Promise.resolve(
                [...this.statements.values()].filter(
                    (item) => item.actor.mbox === mbox && item.verb.id === verb,
                ),
            );
        }

        create(value: TXApiStatement): Promise<void> {
            this.statements.set(value.id, value);
            return Promise.resolve();
        }
    }

    let gateway: StatementIdempotencyGateway;

    beforeEach(() => {
        gateway = new InMemoryStatementIdempotencyGateway();
    });

    it('deve permitir uma implementação do contrato abstrato', () => {
        expect(gateway).toBeInstanceOf(StatementIdempotencyGateway);
        expect(typeof gateway.getById).toBe('function');
        expect(typeof gateway.getByActorAndVerb).toBe('function');
        expect(typeof gateway.create).toBe('function');
    });

    it('deve retornar null quando não houver statement com o ID', async () => {
        await expect(gateway.getById('inexistente')).resolves.toBeNull();
    });

    it('deve criar um statement e recuperá-lo por ID', async () => {
        const stored = statement('statement-1');

        await expect(gateway.create(stored)).resolves.toBeUndefined();
        await expect(gateway.getById(stored.id)).resolves.toBe(stored);
    });

    it('deve retornar lista vazia quando não houver histórico do ator e verbo', async () => {
        await expect(
            gateway.getByActorAndVerb(MBOX, XAPI_VERBS.COMPLETED),
        ).resolves.toEqual([]);
    });

    it('deve filtrar por ator e por verbo', async () => {
        const expected = statement('statement-1');
        await gateway.create(expected);
        await gateway.create(
            statement('statement-2', 'mailto:outro@email.com'),
        );
        await gateway.create(
            statement('statement-3', MBOX, XAPI_VERBS.EARNED_POINTS),
        );

        await expect(
            gateway.getByActorAndVerb(MBOX, XAPI_VERBS.COMPLETED),
        ).resolves.toEqual([expected]);
    });

    it('deve retornar todos os statements do mesmo ator e verbo', async () => {
        const first = statement('statement-1');
        const second = statement('statement-2');
        await gateway.create(first);
        await gateway.create(second);

        await expect(
            gateway.getByActorAndVerb(MBOX, XAPI_VERBS.COMPLETED),
        ).resolves.toEqual([first, second]);
    });

    it('deve manter os registros isolados entre instâncias', async () => {
        await gateway.create(statement('statement-1'));
        const another = new InMemoryStatementIdempotencyGateway();

        await expect(another.getById('statement-1')).resolves.toBeNull();
    });
});
