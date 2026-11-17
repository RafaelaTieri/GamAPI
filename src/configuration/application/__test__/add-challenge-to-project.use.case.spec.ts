import { BadRequestException, NotFoundException } from '@nestjs/common';

import type { ConfigurationGateway } from '../../domain/configuration.gateway';
import { AddChallengeToProjectUseCase } from '../add-challenge-to-project.use.case';

describe('AddChallengeToProjectUseCase', () => {
    let useCase: AddChallengeToProjectUseCase;

    let gateway: {
        findProjectById: jest.Mock;
        findChallengeById: jest.Mock;
        addChallengeToProject: jest.Mock;
    };

    const PROJECT_ID = 'project-1';
    const CHALLENGE_ID = 'challenge-1';

    const project = {
        id: PROJECT_ID,
        name: 'Projeto UX',
        active: true,
    };

    const challenge = {
        id: CHALLENGE_ID,
        name: 'Desafio de UX',
        active: true,
    };

    beforeEach(() => {
        gateway = {
            findProjectById: jest.fn().mockResolvedValue(project),
            findChallengeById: jest.fn().mockResolvedValue(challenge),
            addChallengeToProject: jest.fn().mockResolvedValue(undefined),
        };

        useCase = new AddChallengeToProjectUseCase(
            gateway as unknown as ConfigurationGateway,
        );
    });

    describe('Validação dos parâmetros', () => {
        it('deve rejeitar projectId vazio', async () => {
            await expect(useCase.execute('', CHALLENGE_ID)).rejects.toThrow(
                BadRequestException,
            );

            expect(gateway.findProjectById).not.toHaveBeenCalled();
            expect(gateway.findChallengeById).not.toHaveBeenCalled();
            expect(gateway.addChallengeToProject).not.toHaveBeenCalled();
        });

        it('deve rejeitar challengeId vazio', async () => {
            await expect(useCase.execute(PROJECT_ID, '')).rejects.toThrow(
                BadRequestException,
            );

            expect(gateway.findProjectById).not.toHaveBeenCalled();
            expect(gateway.findChallengeById).not.toHaveBeenCalled();
            expect(gateway.addChallengeToProject).not.toHaveBeenCalled();
        });

        it('deve rejeitar ambos os identificadores vazios', async () => {
            await expect(useCase.execute('', '')).rejects.toThrow(
                'Informe o projeto e o desafio.',
            );

            expect(gateway.findProjectById).not.toHaveBeenCalled();
        });

        it('deve rejeitar projectId undefined', async () => {
            await expect(
                useCase.execute(undefined as unknown as string, CHALLENGE_ID),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findProjectById).not.toHaveBeenCalled();
        });

        it('deve rejeitar challengeId undefined', async () => {
            await expect(
                useCase.execute(PROJECT_ID, undefined as unknown as string),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findProjectById).not.toHaveBeenCalled();
        });

        it('deve rejeitar projectId null', async () => {
            await expect(
                useCase.execute(null as unknown as string, CHALLENGE_ID),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findProjectById).not.toHaveBeenCalled();
        });

        it('deve rejeitar challengeId null', async () => {
            await expect(
                useCase.execute(PROJECT_ID, null as unknown as string),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findProjectById).not.toHaveBeenCalled();
        });
    });

    describe('Validação do projeto', () => {
        it('deve rejeitar projeto inexistente', async () => {
            gateway.findProjectById.mockResolvedValue(null);

            await expect(
                useCase.execute(PROJECT_ID, CHALLENGE_ID),
            ).rejects.toThrow(NotFoundException);

            expect(gateway.findProjectById).toHaveBeenCalledWith(PROJECT_ID);

            expect(gateway.findChallengeById).not.toHaveBeenCalled();
            expect(gateway.addChallengeToProject).not.toHaveBeenCalled();
        });

        it('deve rejeitar projeto inativo', async () => {
            gateway.findProjectById.mockResolvedValue({
                ...project,
                active: false,
            });

            await expect(
                useCase.execute(PROJECT_ID, CHALLENGE_ID),
            ).rejects.toThrow('Projeto não encontrado ou inativo.');

            expect(gateway.findChallengeById).not.toHaveBeenCalled();
            expect(gateway.addChallengeToProject).not.toHaveBeenCalled();
        });

        it('deve rejeitar projeto retornado como undefined', async () => {
            gateway.findProjectById.mockResolvedValue(undefined);

            await expect(
                useCase.execute(PROJECT_ID, CHALLENGE_ID),
            ).rejects.toThrow(NotFoundException);

            expect(gateway.findChallengeById).not.toHaveBeenCalled();
        });

        it('deve propagar erros na consulta do projeto', async () => {
            gateway.findProjectById.mockRejectedValue(
                new Error('Falha ao consultar projeto.'),
            );

            await expect(
                useCase.execute(PROJECT_ID, CHALLENGE_ID),
            ).rejects.toThrow('Falha ao consultar projeto.');

            expect(gateway.findChallengeById).not.toHaveBeenCalled();
            expect(gateway.addChallengeToProject).not.toHaveBeenCalled();
        });
    });

    describe('Validação do desafio', () => {
        it('deve rejeitar desafio inexistente', async () => {
            gateway.findChallengeById.mockResolvedValue(null);

            await expect(
                useCase.execute(PROJECT_ID, CHALLENGE_ID),
            ).rejects.toThrow(NotFoundException);

            expect(gateway.findProjectById).toHaveBeenCalledWith(PROJECT_ID);

            expect(gateway.findChallengeById).toHaveBeenCalledWith(
                CHALLENGE_ID,
            );

            expect(gateway.addChallengeToProject).not.toHaveBeenCalled();
        });

        it('deve rejeitar desafio inativo', async () => {
            gateway.findChallengeById.mockResolvedValue({
                ...challenge,
                active: false,
            });

            await expect(
                useCase.execute(PROJECT_ID, CHALLENGE_ID),
            ).rejects.toThrow('Desafio não encontrado ou inativo.');

            expect(gateway.addChallengeToProject).not.toHaveBeenCalled();
        });

        it('deve rejeitar desafio retornado como undefined', async () => {
            gateway.findChallengeById.mockResolvedValue(undefined);

            await expect(
                useCase.execute(PROJECT_ID, CHALLENGE_ID),
            ).rejects.toThrow(NotFoundException);

            expect(gateway.addChallengeToProject).not.toHaveBeenCalled();
        });

        it('deve propagar erros na consulta do desafio', async () => {
            gateway.findChallengeById.mockRejectedValue(
                new Error('Falha ao consultar desafio.'),
            );

            await expect(
                useCase.execute(PROJECT_ID, CHALLENGE_ID),
            ).rejects.toThrow('Falha ao consultar desafio.');

            expect(gateway.addChallengeToProject).not.toHaveBeenCalled();
        });
    });

    describe('Associação do desafio ao projeto', () => {
        it('deve associar o desafio quando ambos estão ativos', async () => {
            await useCase.execute(PROJECT_ID, CHALLENGE_ID);

            expect(gateway.findProjectById).toHaveBeenCalledTimes(1);
            expect(gateway.findProjectById).toHaveBeenCalledWith(PROJECT_ID);

            expect(gateway.findChallengeById).toHaveBeenCalledTimes(1);
            expect(gateway.findChallengeById).toHaveBeenCalledWith(
                CHALLENGE_ID,
            );

            expect(gateway.addChallengeToProject).toHaveBeenCalledTimes(1);
            expect(gateway.addChallengeToProject).toHaveBeenCalledWith(
                PROJECT_ID,
                CHALLENGE_ID,
            );
        });

        it('deve retornar undefined após associação bem-sucedida', async () => {
            const result = await useCase.execute(PROJECT_ID, CHALLENGE_ID);

            expect(result).toBeUndefined();
        });

        it('deve utilizar os identificadores recebidos', async () => {
            await useCase.execute('project-2', 'challenge-2');

            expect(gateway.findProjectById).toHaveBeenCalledWith('project-2');

            expect(gateway.findChallengeById).toHaveBeenCalledWith(
                'challenge-2',
            );

            expect(gateway.addChallengeToProject).toHaveBeenCalledWith(
                'project-2',
                'challenge-2',
            );
        });

        it('deve propagar falhas durante a associação', async () => {
            gateway.addChallengeToProject.mockRejectedValue(
                new Error('Falha ao associar desafio.'),
            );

            await expect(
                useCase.execute(PROJECT_ID, CHALLENGE_ID),
            ).rejects.toThrow('Falha ao associar desafio.');

            expect(gateway.addChallengeToProject).toHaveBeenCalledTimes(1);
        });

        it('deve preservar o erro original da associação', async () => {
            const error = new Error('Erro de persistência.');

            gateway.addChallengeToProject.mockRejectedValue(error);

            await expect(
                useCase.execute(PROJECT_ID, CHALLENGE_ID),
            ).rejects.toBe(error);
        });
    });
});
