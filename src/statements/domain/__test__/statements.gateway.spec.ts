import { XAPI_VERBS } from '../../../xapi/domain/xapi.constants';
import type {
    TXApiStatement,
    TXApiStatementResult,
} from '../statements.entities';
import { StatementGateway } from '../statements.gateway';

describe('StatementGateway', () => {
    const participantMbox = 'mailto:aluno@example.com';

    const createStatement = (
        id: string,
        verb: string = XAPI_VERBS.COMPLETED,
        mbox: string = participantMbox,
    ): TXApiStatement => ({
        id,
        actor: { name: 'Aluno Teste', mbox },
        verb: { id: verb },
        object: { id: 'https://gamapi.dev/challenges/1' },
    });

    class InMemoryStatementGateway extends StatementGateway {
        private readonly statements = new Map<string, TXApiStatement>();

        create(statement: TXApiStatement): Promise<TXApiStatement> {
            this.statements.set(statement.id, statement);
            return Promise.resolve(statement);
        }

        getById(id: string): Promise<TXApiStatement> {
            const statement = this.statements.get(id);

            if (!statement) {
                return Promise.reject(new Error('Statement não encontrado.'));
            }

            return Promise.resolve(statement);
        }

        getPointsByActor(mbox: string): Promise<TXApiStatementResult> {
            const statements = [...this.statements.values()].filter(
                (statement) =>
                    statement.actor.mbox === mbox &&
                    statement.verb.id === XAPI_VERBS.EARNED_POINTS,
            );

            return Promise.resolve({ statements });
        }

        getAllStatementsByActor(mbox: string): Promise<TXApiStatementResult> {
            const statements = [...this.statements.values()].filter(
                (statement) => statement.actor.mbox === mbox,
            );

            return Promise.resolve({ statements });
        }
    }

    let gateway: InMemoryStatementGateway;

    beforeEach(() => {
        gateway = new InMemoryStatementGateway();
    });

    it('deve permitir implementar o contrato abstrato', () => {
        expect(gateway).toBeInstanceOf(StatementGateway);
        expect(typeof gateway.create).toBe('function');
        expect(typeof gateway.getById).toBe('function');
        expect(typeof gateway.getPointsByActor).toBe('function');
        expect(typeof gateway.getAllStatementsByActor).toBe('function');
    });

    it('deve criar e recuperar um statement pelo identificador', async () => {
        const statement = createStatement('statement-1');

        const created = await gateway.create(statement);
        const found = await gateway.getById(statement.id);

        expect(created).toBe(statement);
        expect(found).toBe(statement);
    });

    it('deve sinalizar quando o statement não existe', async () => {
        await expect(gateway.getById('inexistente')).rejects.toThrow(
            'Statement não encontrado.',
        );
    });

    it('deve retornar somente recompensas de pontos do ator', async () => {
        const expected = createStatement('points-1', XAPI_VERBS.EARNED_POINTS);
        const otherVerb = createStatement('completed-1');
        const otherActor = createStatement(
            'points-2',
            XAPI_VERBS.EARNED_POINTS,
            'mailto:outro@example.com',
        );

        await gateway.create(expected);
        await gateway.create(otherVerb);
        await gateway.create(otherActor);

        expect(await gateway.getPointsByActor(participantMbox)).toEqual({
            statements: [expected],
        });
    });

    it('deve retornar lista vazia quando o ator não tem pontos', async () => {
        expect(await gateway.getPointsByActor(participantMbox)).toEqual({
            statements: [],
        });
    });

    it('deve listar os statements do ator sem incluir outros atores', async () => {
        const first = createStatement('statement-1');
        const second = createStatement('statement-2', XAPI_VERBS.EARNED_POINTS);
        const other = createStatement(
            'statement-3',
            XAPI_VERBS.COMPLETED,
            'mailto:outro@example.com',
        );

        await gateway.create(first);
        await gateway.create(second);
        await gateway.create(other);

        expect(await gateway.getAllStatementsByActor(participantMbox)).toEqual({
            statements: [first, second],
        });
    });

    it('deve manter os registros isolados por instância', async () => {
        await gateway.create(createStatement('statement-1'));

        const otherGateway = new InMemoryStatementGateway();

        expect(
            await otherGateway.getAllStatementsByActor(participantMbox),
        ).toEqual({
            statements: [],
        });
    });
});
