import { BadRequestException, NotFoundException } from '@nestjs/common';

import type { GetProjectLeaderboardUseCase } from '../../application/get-project-leaderboard.use.case';
import type { TProjectLeaderboard } from '../../domain/leaderboard.entities';
import { LeaderboardController } from '../leaderboard.controller';

describe('LeaderboardController', () => {
    let controller: LeaderboardController;
    let executeMock: jest.Mock<Promise<TProjectLeaderboard>, [string, number]>;

    const PROJECT_ID = 'project-1';
    const leaderboard: TProjectLeaderboard = {
        projectId: PROJECT_ID,
        projectName: 'Projeto UX',
        leaderboard: [
            {
                position: 1,
                name: 'Ana',
                mbox: 'mailto:ana@email.com',
                points: 40,
            },
        ],
    };

    beforeEach(() => {
        executeMock = jest
            .fn<Promise<TProjectLeaderboard>, [string, number]>()
            .mockResolvedValue(leaderboard);

        controller = new LeaderboardController({
            execute: executeMock,
        } as unknown as GetProjectLeaderboardUseCase);
    });

    it('utiliza o limite padrão de dez quando não é informado', async () => {
        const result = await controller.getProjectLeaderboard(PROJECT_ID);

        expect(executeMock).toHaveBeenCalledWith(PROJECT_ID, 10);
        expect(result).toBe(leaderboard);
    });

    it.each<[string, number]>([
        ['1', 1],
        ['20', 20],
        ['100', 100],
        ['0', 0],
        ['-5', -5],
        ['2.5', 2.5],
        ['', 0],
        [' ', 0],
        ['Infinity', Infinity],
    ])('converte o limite %p para o número %p', async (input, expected) => {
        await controller.getProjectLeaderboard(PROJECT_ID, input);

        expect(executeMock).toHaveBeenCalledWith(PROJECT_ID, expected);
    });

    it('encaminha NaN para validação do Use Case', async () => {
        await controller.getProjectLeaderboard(PROJECT_ID, 'texto');

        expect(executeMock).toHaveBeenCalledWith(PROJECT_ID, NaN);
    });

    it('preserva o identificador do projeto recebido', async () => {
        await controller.getProjectLeaderboard('project-2', '5');

        expect(executeMock).toHaveBeenCalledWith('project-2', 5);
        expect(executeMock).toHaveBeenCalledTimes(1);
    });

    it('retorna o objeto recebido do Use Case sem alterações', async () => {
        const result = await controller.getProjectLeaderboard(PROJECT_ID, '3');

        expect(result).toEqual(leaderboard);
        expect(result).toBe(leaderboard);
    });

    it('propaga erros de parâmetros inválidos', async () => {
        const error = new BadRequestException('Informe o projeto.');
        executeMock.mockRejectedValue(error);

        await expect(controller.getProjectLeaderboard('', '5')).rejects.toBe(
            error,
        );
    });

    it('propaga erros de projeto inexistente', async () => {
        const error = new NotFoundException(
            'Projeto não encontrado ou inativo.',
        );
        executeMock.mockRejectedValue(error);

        await expect(
            controller.getProjectLeaderboard('inexistente'),
        ).rejects.toBe(error);
    });

    it('propaga erros inesperados do Use Case', async () => {
        const error = new Error('Erro ao consultar o Ralph');
        executeMock.mockRejectedValue(error);

        await expect(controller.getProjectLeaderboard(PROJECT_ID)).rejects.toBe(
            error,
        );
    });
});
