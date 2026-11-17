import { BadRequestException, NotFoundException } from '@nestjs/common';

import type { CreateStatementUseCase } from '../../application/create-statement.use.case';
import type { GetAccumulatedPointsUseCase } from '../../application/get-accumulated-points.use.case';
import type { GetAllStatementsUseCase } from '../../application/get-all-statements-by-actor.use.case';
import type { GetStatementUseCase } from '../../application/get-statement-by-id.use.case';
import type { TXApiStatement } from '../../domain/statements.entities';
import { StatementsController } from '../statements.controller';

describe('StatementsController', () => {
    let controller: StatementsController;
    let createMock: jest.Mock<Promise<TXApiStatement>, [TXApiStatement]>;
    let getByIdMock: jest.Mock<Promise<TXApiStatement>, [string]>;
    let getAccumulatedPointsMock: jest.Mock<Promise<number>, [string]>;
    let getAllStatementsMock: jest.Mock<Promise<TXApiStatement[]>, [string]>;

    const mbox = 'mailto:aluno@example.com';
    const statement: TXApiStatement = {
        id: 'statement-1',
        actor: { name: 'Aluno Teste', mbox },
        verb: { id: 'https://adlnet.gov/expapi/verbs/completed' },
        object: { id: 'https://gamapi.dev/challenges/1' },
    };
    const secondStatement: TXApiStatement = {
        ...statement,
        id: 'statement-2',
    };

    beforeEach(() => {
        createMock = jest
            .fn<Promise<TXApiStatement>, [TXApiStatement]>()
            .mockResolvedValue(statement);
        getByIdMock = jest
            .fn<Promise<TXApiStatement>, [string]>()
            .mockResolvedValue(statement);
        getAccumulatedPointsMock = jest
            .fn<Promise<number>, [string]>()
            .mockResolvedValue(50);
        getAllStatementsMock = jest
            .fn<Promise<TXApiStatement[]>, [string]>()
            .mockResolvedValue([statement, secondStatement]);

        controller = new StatementsController(
            { execute: createMock } as unknown as CreateStatementUseCase,
            { execute: getByIdMock } as unknown as GetStatementUseCase,
            {
                execute: getAccumulatedPointsMock,
            } as unknown as GetAccumulatedPointsUseCase,
            {
                execute: getAllStatementsMock,
            } as unknown as GetAllStatementsUseCase,
        );
    });

    describe('create', () => {
        it('deve encaminhar o statement ao Use Case e devolver o retorno', async () => {
            const result = await controller.create(statement);

            expect(result).toBe(statement);
            expect(createMock).toHaveBeenCalledTimes(1);
            expect(createMock).toHaveBeenCalledWith(statement);
            expect(getByIdMock).not.toHaveBeenCalled();
        });

        it('deve manter o statement recebido sem alterações', async () => {
            const original = structuredClone(statement);

            await controller.create(statement);

            expect(statement).toEqual(original);
        });

        it('deve devolver exatamente o statement retornado pelo Use Case', async () => {
            createMock.mockResolvedValue(secondStatement);

            await expect(controller.create(statement)).resolves.toBe(
                secondStatement,
            );
        });

        it('deve propagar erro de validação', async () => {
            const error = new BadRequestException('Statement inválido.');
            createMock.mockRejectedValue(error);

            await expect(controller.create(statement)).rejects.toBe(error);
        });

        it('deve propagar erros inesperados', async () => {
            const error = new Error('Ralph indisponível.');
            createMock.mockRejectedValue(error);

            await expect(controller.create(statement)).rejects.toBe(error);
        });
    });

    describe('getAccumulatedPoints', () => {
        it('deve consultar o ator e retornar os pontos acumulados', async () => {
            const result = await controller.getAccumulatedPoints(mbox);

            expect(result).toEqual({ points: 50 });
            expect(getAccumulatedPointsMock).toHaveBeenCalledTimes(1);
            expect(getAccumulatedPointsMock).toHaveBeenCalledWith(mbox);
        });

        it('deve retornar zero pontos', async () => {
            getAccumulatedPointsMock.mockResolvedValue(0);

            await expect(
                controller.getAccumulatedPoints(mbox),
            ).resolves.toEqual({
                points: 0,
            });
        });

        it('deve encaminhar o valor recebido sem modificá-lo', async () => {
            await controller.getAccumulatedPoints('');

            expect(getAccumulatedPointsMock).toHaveBeenCalledWith('');
        });

        it('deve propagar a exceção do Use Case', async () => {
            const error = new BadRequestException(
                'Informe o e-mail do participante.',
            );
            getAccumulatedPointsMock.mockRejectedValue(error);

            await expect(controller.getAccumulatedPoints('')).rejects.toBe(
                error,
            );
        });
    });

    describe('getAllStatements', () => {
        it('deve encaminhar o ator e retornar os statements', async () => {
            const result = await controller.getAllStatements(mbox);

            expect(result).toEqual({
                statements: [statement, secondStatement],
            });
            expect(getAllStatementsMock).toHaveBeenCalledTimes(1);
            expect(getAllStatementsMock).toHaveBeenCalledWith(mbox);
        });

        it('deve retornar uma lista vazia', async () => {
            getAllStatementsMock.mockResolvedValue([]);

            await expect(controller.getAllStatements(mbox)).resolves.toEqual({
                statements: [],
            });
        });

        it('deve encaminhar o valor recebido sem modificá-lo', async () => {
            await controller.getAllStatements('');

            expect(getAllStatementsMock).toHaveBeenCalledWith('');
        });

        it('deve propagar a exceção do Use Case', async () => {
            const error = new BadRequestException(
                'Informe o e-mail do participante.',
            );
            getAllStatementsMock.mockRejectedValue(error);

            await expect(controller.getAllStatements('')).rejects.toBe(error);
        });
    });

    describe('getById', () => {
        it('deve consultar o ID recebido e retornar o statement', async () => {
            const result = await controller.getById(statement.id);

            expect(result).toBe(statement);
            expect(getByIdMock).toHaveBeenCalledTimes(1);
            expect(getByIdMock).toHaveBeenCalledWith(statement.id);
        });

        it('deve utilizar o identificador original', async () => {
            getByIdMock.mockResolvedValue(secondStatement);

            await expect(controller.getById('statement-2')).resolves.toBe(
                secondStatement,
            );
            expect(getByIdMock).toHaveBeenCalledWith('statement-2');
        });

        it('deve propagar erro quando o statement não existir', async () => {
            const error = new NotFoundException('Statement não encontrado.');
            getByIdMock.mockRejectedValue(error);

            await expect(controller.getById('inexistente')).rejects.toBe(error);
        });

        it('deve propagar falhas inesperadas', async () => {
            const error = new Error('Falha ao consultar statement.');
            getByIdMock.mockRejectedValue(error);

            await expect(controller.getById(statement.id)).rejects.toBe(error);
        });
    });
});
