import { BadRequestException } from '@nestjs/common';

import {
    XAPI_EXTENSIONS,
    XAPI_VERBS,
} from '../../../xapi/domain/xapi.constants';
import type {
    TXApiStatement,
    TXApiStatementResult,
} from '../../domain/statements.entities';
import type { StatementGateway } from '../../domain/statements.gateway';
import { GetAccumulatedPointsUseCase } from '../get-accumulated-points.use.case';

describe('GetAccumulatedPointsUseCase', () => {
    const MBOX = 'mailto:aluno@email.com';

    const statement = (result?: TXApiStatement['result']): TXApiStatement => ({
        id: 'statement-1',
        actor: { mbox: MBOX },
        verb: { id: XAPI_VERBS.EARNED_POINTS },
        object: { id: 'https://gamapi.dev/points' },
        result,
    });

    const withPoints = (points: number | string | boolean): TXApiStatement =>
        statement({ extensions: { [XAPI_EXTENSIONS.POINTS]: points } });

    let useCase: GetAccumulatedPointsUseCase;
    let getPointsByActor: jest.Mock<Promise<TXApiStatementResult>, [string]>;

    beforeEach(() => {
        getPointsByActor = jest
            .fn<Promise<TXApiStatementResult>, [string]>()
            .mockResolvedValue({ statements: [] });

        useCase = new GetAccumulatedPointsUseCase({
            getPointsByActor,
        } as unknown as StatementGateway);
    });

    it('retorna zero quando o participante não tem recompensas', async () => {
        await expect(useCase.execute(MBOX)).resolves.toBe(0);
        expect(getPointsByActor).toHaveBeenCalledWith(MBOX);
    });

    it('soma pontos de diversos statements', async () => {
        getPointsByActor.mockResolvedValue({
            statements: [withPoints(10), withPoints(20), withPoints(5)],
        });

        await expect(useCase.execute(MBOX)).resolves.toBe(35);
        expect(getPointsByActor).toHaveBeenCalledTimes(1);
    });

    it('ignora statements sem resultado e sem extensões', async () => {
        getPointsByActor.mockResolvedValue({
            statements: [statement(), statement({}), withPoints(25)],
        });

        await expect(useCase.execute(MBOX)).resolves.toBe(25);
    });

    it('ignora extensões sem o campo de pontos', async () => {
        getPointsByActor.mockResolvedValue({
            statements: [
                statement({ extensions: { 'https://gamapi.dev/other': 300 } }),
                withPoints(6),
            ],
        });

        await expect(useCase.execute(MBOX)).resolves.toBe(6);
    });

    it('ignora valores que não são números', async () => {
        getPointsByActor.mockResolvedValue({
            statements: [
                withPoints('30'),
                withPoints(true),
                withPoints(false),
                withPoints(8),
            ],
        });

        await expect(useCase.execute(MBOX)).resolves.toBe(8);
    });

    it('inclui valores zero, negativos e fracionários, conforme a implementação', async () => {
        getPointsByActor.mockResolvedValue({
            statements: [withPoints(0), withPoints(-5), withPoints(2.5)],
        });

        await expect(useCase.execute(MBOX)).resolves.toBe(-2.5);
    });

    it('não filtra Infinity nem NaN, pois ambos são valores do tipo number', async () => {
        getPointsByActor.mockResolvedValue({
            statements: [withPoints(Infinity)],
        });
        await expect(useCase.execute(MBOX)).resolves.toBe(Infinity);

        getPointsByActor.mockResolvedValue({ statements: [withPoints(NaN)] });
        await expect(useCase.execute(MBOX)).resolves.toBeNaN();
    });

    it.each(['', undefined, null])('rejeita mbox ausente: %p', async (mbox) => {
        await expect(useCase.execute(mbox as string)).rejects.toThrow(
            BadRequestException,
        );
        expect(getPointsByActor).not.toHaveBeenCalled();
    });

    it('usa a mensagem de validação esperada', async () => {
        await expect(useCase.execute('')).rejects.toThrow(
            'Informe o e-mail do participante.',
        );
    });

    it('propaga erros da consulta ao gateway', async () => {
        const error = new Error('Ralph indisponível.');
        getPointsByActor.mockRejectedValue(error);

        await expect(useCase.execute(MBOX)).rejects.toBe(error);
    });
});
