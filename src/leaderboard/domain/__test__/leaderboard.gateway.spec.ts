import type { TXApiStatement } from '../../../statements/domain/statements.entities';
import { XAPI_VERBS } from '../../../xapi/domain/xapi.constants';
import { LeaderboardGateway } from '../leaderboard.gateway';

class InMemoryLeaderboardGateway extends LeaderboardGateway {
    private readonly statements: TXApiStatement[] = [];

    add(statement: TXApiStatement): void {
        this.statements.push(statement);
    }

    getByVerb(verb: string): Promise<TXApiStatement[]> {
        return Promise.resolve(
            this.statements.filter((statement) => statement.verb.id === verb),
        );
    }
}

describe('LeaderboardGateway', () => {
    let gateway: InMemoryLeaderboardGateway;

    const createStatement = (id: string, verb: string): TXApiStatement => ({
        id,
        actor: { mbox: 'mailto:aluno@email.com' },
        verb: { id: verb },
        object: { id: 'https://gamapi.dev/challenges/teste' },
    });

    beforeEach(() => {
        gateway = new InMemoryLeaderboardGateway();
    });

    it('permite implementar o contrato abstrato', () => {
        expect(gateway).toBeInstanceOf(LeaderboardGateway);
        expect(typeof gateway.getByVerb).toBe('function');
    });

    it('retorna uma lista vazia quando não existem statements', async () => {
        await expect(gateway.getByVerb(XAPI_VERBS.COMPLETED)).resolves.toEqual(
            [],
        );
    });

    it('retorna apenas statements do verbo solicitado', async () => {
        const completed = createStatement('c1', XAPI_VERBS.COMPLETED);
        const points = createStatement('p1', XAPI_VERBS.EARNED_POINTS);
        gateway.add(completed);
        gateway.add(points);

        await expect(gateway.getByVerb(XAPI_VERBS.COMPLETED)).resolves.toEqual([
            completed,
        ]);
        await expect(
            gateway.getByVerb(XAPI_VERBS.EARNED_POINTS),
        ).resolves.toEqual([points]);
    });

    it('retorna todos os statements correspondentes', async () => {
        const first = createStatement('c1', XAPI_VERBS.COMPLETED);
        const second = createStatement('c2', XAPI_VERBS.COMPLETED);
        gateway.add(first);
        gateway.add(second);

        await expect(gateway.getByVerb(XAPI_VERBS.COMPLETED)).resolves.toEqual([
            first,
            second,
        ]);
    });

    it('mantém instâncias isoladas', async () => {
        gateway.add(createStatement('c1', XAPI_VERBS.COMPLETED));
        const otherGateway = new InMemoryLeaderboardGateway();

        await expect(
            otherGateway.getByVerb(XAPI_VERBS.COMPLETED),
        ).resolves.toEqual([]);
    });
});
