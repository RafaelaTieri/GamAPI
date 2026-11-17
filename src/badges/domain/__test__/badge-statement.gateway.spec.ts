import type { TXApiStatement } from '../../../statements/domain/statements.entities';
import { XAPI_VERBS } from '../../../xapi/domain/xapi.constants';
import { BadgeStatementGateway } from '../badge-statement.gateway';

describe('BadgeStatementGateway', () => {
    const mbox = 'mailto:aluno@email.com';

    const createStatement = (
        id: string,
        actorMbox: string = mbox,
        verb: string = XAPI_VERBS.EARNED_BADGE,
    ): TXApiStatement => ({
        id,
        actor: {
            name: 'Aluno Teste',
            mbox: actorMbox,
        },
        verb: { id: verb },
        object: {
            id: 'https://gamapi.dev/badges/ux-master',
        },
    });

    class InMemoryBadgeStatementGateway extends BadgeStatementGateway {
        private readonly statements: TXApiStatement[] = [];

        getByActorAndVerb(
            actorMbox: string,
            verb: string,
        ): Promise<TXApiStatement[]> {
            return Promise.resolve(
                this.statements.filter(
                    (statement) =>
                        statement.actor.mbox === actorMbox &&
                        statement.verb.id === verb,
                ),
            );
        }

        create(statement: TXApiStatement): Promise<void> {
            this.statements.push(statement);
            return Promise.resolve();
        }
    }

    let gateway: BadgeStatementGateway;

    beforeEach(() => {
        gateway = new InMemoryBadgeStatementGateway();
    });

    it('deve permitir implementar o contrato abstrato', () => {
        expect(gateway).toBeInstanceOf(BadgeStatementGateway);
    });

    it('deve permitir registrar um statement', async () => {
        const statement = createStatement('statement-1');

        await expect(gateway.create(statement)).resolves.toBeUndefined();

        const result = await gateway.getByActorAndVerb(
            mbox,
            XAPI_VERBS.EARNED_BADGE,
        );

        expect(result).toEqual([statement]);
    });

    it('deve retornar uma lista vazia quando não existem statements', async () => {
        const result = await gateway.getByActorAndVerb(
            mbox,
            XAPI_VERBS.EARNED_BADGE,
        );

        expect(result).toEqual([]);
    });

    it('deve filtrar statements pelo ator', async () => {
        const expectedStatement = createStatement('statement-1');
        const otherStatement = createStatement(
            'statement-2',
            'mailto:outro@email.com',
        );

        await gateway.create(expectedStatement);
        await gateway.create(otherStatement);

        const result = await gateway.getByActorAndVerb(
            mbox,
            XAPI_VERBS.EARNED_BADGE,
        );

        expect(result).toEqual([expectedStatement]);
    });

    it('deve filtrar statements pelo verbo', async () => {
        const expectedStatement = createStatement('statement-1');

        const otherStatement = createStatement(
            'statement-2',
            mbox,
            XAPI_VERBS.COMPLETED,
        );

        await gateway.create(expectedStatement);
        await gateway.create(otherStatement);

        const result = await gateway.getByActorAndVerb(
            mbox,
            XAPI_VERBS.EARNED_BADGE,
        );

        expect(result).toEqual([expectedStatement]);
    });

    it('deve retornar todos os statements correspondentes', async () => {
        const firstStatement = createStatement('statement-1');
        const secondStatement = createStatement('statement-2');

        await gateway.create(firstStatement);
        await gateway.create(secondStatement);

        const result = await gateway.getByActorAndVerb(
            mbox,
            XAPI_VERBS.EARNED_BADGE,
        );

        expect(result).toEqual([firstStatement, secondStatement]);
    });

    it('deve manter os registros isolados entre instâncias', async () => {
        const otherGateway = new InMemoryBadgeStatementGateway();

        await gateway.create(createStatement('statement-1'));

        const result = await otherGateway.getByActorAndVerb(
            mbox,
            XAPI_VERBS.EARNED_BADGE,
        );

        expect(result).toEqual([]);
    });
});
