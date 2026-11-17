import { BadRequestException } from '@nestjs/common';

import type {
    TXApiStatement,
    TXApiStatementResult,
} from '../../domain/statements.entities';
import type { StatementGateway } from '../../domain/statements.gateway';
import { GetAllStatementsUseCase } from '../get-all-statements-by-actor.use.case';

describe('GetAllStatementsUseCase', () => {
    const MBOX = 'mailto:aluno@email.com';
    const first: TXApiStatement = {
        id: 'statement-1',
        actor: { mbox: MBOX },
        verb: { id: 'https://example.org/verbs/completed' },
        object: { id: 'https://gamapi.dev/challenges/1' },
    };

    let useCase: GetAllStatementsUseCase;
    let getAllStatementsByActor: jest.Mock<
        Promise<TXApiStatementResult>,
        [string]
    >;

    beforeEach(() => {
        getAllStatementsByActor = jest
            .fn<Promise<TXApiStatementResult>, [string]>()
            .mockResolvedValue({ statements: [] });

        useCase = new GetAllStatementsUseCase({
            getAllStatementsByActor,
        } as unknown as StatementGateway);
    });

    it('retorna a lista de statements do ator', async () => {
        const second: TXApiStatement = { ...first, id: 'statement-2' };
        const statements = [first, second];
        getAllStatementsByActor.mockResolvedValue({ statements });

        const result = await useCase.execute(MBOX);

        expect(result).toBe(statements);
        expect(getAllStatementsByActor).toHaveBeenCalledTimes(1);
        expect(getAllStatementsByActor).toHaveBeenCalledWith(MBOX);
    });

    it('retorna lista vazia quando não existem statements', async () => {
        await expect(useCase.execute(MBOX)).resolves.toEqual([]);
    });

    it('preserva o identificador recebido, sem normalização', async () => {
        await useCase.execute('  mailto:outro@email.com  ');

        expect(getAllStatementsByActor).toHaveBeenCalledWith(
            '  mailto:outro@email.com  ',
        );
    });

    it.each(['', undefined, null])(
        'rejeita e-mail ausente: %p',
        async (mbox) => {
            await expect(useCase.execute(mbox as string)).rejects.toThrow(
                BadRequestException,
            );
            expect(getAllStatementsByActor).not.toHaveBeenCalled();
        },
    );

    it('retorna a mensagem esperada quando o e-mail está vazio', async () => {
        await expect(useCase.execute('')).rejects.toThrow(
            'Informe o e-mail do participante.',
        );
    });

    it('propaga erros do gateway', async () => {
        const error = new Error('Falha ao consultar statements.');
        getAllStatementsByActor.mockRejectedValue(error);

        await expect(useCase.execute(MBOX)).rejects.toBe(error);
    });
});
