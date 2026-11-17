import type { TXApiStatement } from '../../domain/statements.entities';
import type { StatementGateway } from '../../domain/statements.gateway';
import { GetStatementUseCase } from '../get-statement-by-id.use.case';

describe('GetStatementUseCase', () => {
    const statement: TXApiStatement = {
        id: 'statement-1',
        actor: { mbox: 'mailto:aluno@email.com' },
        verb: { id: 'https://example.org/verbs/completed' },
        object: { id: 'https://gamapi.dev/challenges/ux' },
    };

    let useCase: GetStatementUseCase;
    let getById: jest.Mock<Promise<TXApiStatement>, [string]>;

    beforeEach(() => {
        getById = jest
            .fn<Promise<TXApiStatement>, [string]>()
            .mockResolvedValue(statement);

        useCase = new GetStatementUseCase({
            getById,
        } as unknown as StatementGateway);
    });

    it('encaminha o identificador ao gateway e retorna o objeto recebido', async () => {
        const result = await useCase.execute(statement.id);

        expect(getById).toHaveBeenCalledTimes(1);
        expect(getById).toHaveBeenCalledWith(statement.id);
        expect(result).toBe(statement);
    });

    it('encaminha o identificador sem modificá-lo', async () => {
        await useCase.execute('  statement-2  ');

        expect(getById).toHaveBeenCalledWith('  statement-2  ');
    });

    it('delega a validação do identificador ao gateway', async () => {
        await useCase.execute('');

        expect(getById).toHaveBeenCalledWith('');
    });

    it('propaga falhas de consulta', async () => {
        const error = new Error('Statement não encontrado.');
        getById.mockRejectedValue(error);

        await expect(useCase.execute('inexistente')).rejects.toBe(error);
    });
});
