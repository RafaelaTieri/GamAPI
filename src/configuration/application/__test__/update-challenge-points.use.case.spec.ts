import { BadRequestException, NotFoundException } from '@nestjs/common';

import type { TChallenge } from '../../../challenges/domain/challenge.entities';
import type { ConfigurationGateway } from '../../domain/configuration.gateway';
import { UpdateChallengePointsUseCase } from '../update-challenge-points.use.case';

describe('UpdateChallengePointsUseCase', () => {
    let useCase: UpdateChallengePointsUseCase;

    let gateway: {
        findChallengeById: jest.Mock;
        updateChallengePoints: jest.Mock;
    };

    const CHALLENGE_ID = 'challenge-1';

    const challenge: TChallenge = {
        id: CHALLENGE_ID,
        name: 'Desafio de UX',
        iri: 'https://gamapi.dev/challenges/ux',
        points: 40,
        active: true,
    };

    beforeEach(() => {
        gateway = {
            findChallengeById: jest.fn().mockResolvedValue(challenge),
            updateChallengePoints: jest.fn().mockResolvedValue({
                ...challenge,
                points: 100,
            }),
        };

        useCase = new UpdateChallengePointsUseCase(
            gateway as unknown as ConfigurationGateway,
        );
    });

    describe('Validação do identificador', () => {
        it('deve rejeitar challengeId vazio', async () => {
            await expect(useCase.execute('', 100)).rejects.toThrow(
                BadRequestException,
            );

            expect(gateway.findChallengeById).not.toHaveBeenCalled();
            expect(gateway.updateChallengePoints).not.toHaveBeenCalled();
        });

        it('deve retornar a mensagem correta para identificador vazio', async () => {
            await expect(useCase.execute('', 100)).rejects.toThrow(
                'Informe o identificador do desafio.',
            );
        });

        it('deve rejeitar challengeId undefined', async () => {
            await expect(
                useCase.execute(undefined as unknown as string, 100),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findChallengeById).not.toHaveBeenCalled();
        });

        it('deve rejeitar challengeId null', async () => {
            await expect(
                useCase.execute(null as unknown as string, 100),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findChallengeById).not.toHaveBeenCalled();
        });

        it('deve validar o identificador antes da pontuação', async () => {
            await expect(useCase.execute('', -1)).rejects.toThrow(
                'Informe o identificador do desafio.',
            );

            expect(gateway.findChallengeById).not.toHaveBeenCalled();
        });
    });

    describe('Validação da pontuação', () => {
        it.each([
            ['pontuação negativa', -1],
            ['pontuação negativa maior', -100],
            ['pontuação decimal positiva', 10.5],
            ['pontuação decimal negativa', -0.5],
            ['NaN', NaN],
            ['Infinity', Infinity],
            ['-Infinity', -Infinity],
            ['undefined', undefined],
            ['null', null],
            ['string', '100'],
            ['boolean', true],
        ])('deve rejeitar %s', async (_, points) => {
            await expect(
                useCase.execute(CHALLENGE_ID, points as number),
            ).rejects.toThrow('Informe uma pontuação válida.');

            expect(gateway.findChallengeById).not.toHaveBeenCalled();
            expect(gateway.updateChallengePoints).not.toHaveBeenCalled();
        });

        it('deve lançar BadRequestException para pontuação negativa', async () => {
            await expect(
                useCase.execute(CHALLENGE_ID, -10),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('deve aceitar pontuação zero', async () => {
            gateway.updateChallengePoints.mockResolvedValue({
                ...challenge,
                points: 0,
            });

            const result = await useCase.execute(CHALLENGE_ID, 0);

            expect(result.points).toBe(0);
            expect(gateway.updateChallengePoints).toHaveBeenCalledWith(
                CHALLENGE_ID,
                0,
            );
        });

        it('deve aceitar pontuação inteira positiva', async () => {
            const result = await useCase.execute(CHALLENGE_ID, 100);

            expect(result.points).toBe(100);

            expect(gateway.updateChallengePoints).toHaveBeenCalledWith(
                CHALLENGE_ID,
                100,
            );
        });

        it('deve aceitar pontuação -0 sem alterar o valor recebido', async () => {
            gateway.updateChallengePoints.mockResolvedValue({
                ...challenge,
                points: -0,
            });

            await useCase.execute(CHALLENGE_ID, -0);

            expect(gateway.updateChallengePoints).toHaveBeenCalledWith(
                CHALLENGE_ID,
                -0,
            );
        });

        it('deve aceitar Number.MAX_SAFE_INTEGER', async () => {
            const points = Number.MAX_SAFE_INTEGER;

            gateway.updateChallengePoints.mockResolvedValue({
                ...challenge,
                points,
            });

            const result = await useCase.execute(CHALLENGE_ID, points);

            expect(result.points).toBe(points);

            expect(gateway.updateChallengePoints).toHaveBeenCalledWith(
                CHALLENGE_ID,
                points,
            );
        });

        it('não deve consultar o desafio quando a pontuação é inválida', async () => {
            await expect(useCase.execute(CHALLENGE_ID, 1.5)).rejects.toThrow(
                BadRequestException,
            );

            expect(gateway.findChallengeById).not.toHaveBeenCalled();
        });
    });

    describe('Consulta do desafio', () => {
        it('deve consultar o desafio pelo identificador', async () => {
            await useCase.execute(CHALLENGE_ID, 100);

            expect(gateway.findChallengeById).toHaveBeenCalledTimes(1);
            expect(gateway.findChallengeById).toHaveBeenCalledWith(
                CHALLENGE_ID,
            );
        });

        it('deve rejeitar desafio inexistente', async () => {
            gateway.findChallengeById.mockResolvedValue(null);

            await expect(useCase.execute(CHALLENGE_ID, 100)).rejects.toThrow(
                NotFoundException,
            );

            expect(gateway.updateChallengePoints).not.toHaveBeenCalled();
        });

        it('deve retornar a mensagem correta para desafio inexistente', async () => {
            gateway.findChallengeById.mockResolvedValue(null);

            await expect(useCase.execute(CHALLENGE_ID, 100)).rejects.toThrow(
                'Desafio não encontrado ou inativo.',
            );
        });

        it('deve rejeitar desafio inativo', async () => {
            gateway.findChallengeById.mockResolvedValue({
                ...challenge,
                active: false,
            });

            await expect(useCase.execute(CHALLENGE_ID, 100)).rejects.toThrow(
                NotFoundException,
            );

            expect(gateway.updateChallengePoints).not.toHaveBeenCalled();
        });

        it('deve rejeitar desafio retornado como undefined', async () => {
            gateway.findChallengeById.mockResolvedValue(undefined);

            await expect(useCase.execute(CHALLENGE_ID, 100)).rejects.toThrow(
                NotFoundException,
            );

            expect(gateway.updateChallengePoints).not.toHaveBeenCalled();
        });

        it('deve consultar o desafio antes de atualizar a pontuação', async () => {
            await useCase.execute(CHALLENGE_ID, 100);

            expect(
                gateway.findChallengeById.mock.invocationCallOrder[0],
            ).toBeLessThan(
                gateway.updateChallengePoints.mock.invocationCallOrder[0],
            );
        });

        it('deve propagar erros da consulta do desafio', async () => {
            const error = new Error('Falha ao consultar desafio.');

            gateway.findChallengeById.mockRejectedValue(error);

            await expect(useCase.execute(CHALLENGE_ID, 100)).rejects.toBe(
                error,
            );

            expect(gateway.updateChallengePoints).not.toHaveBeenCalled();
        });
    });

    describe('Atualização da pontuação', () => {
        it('deve atualizar os pontos de um desafio ativo', async () => {
            const result = await useCase.execute(CHALLENGE_ID, 100);

            expect(gateway.findChallengeById).toHaveBeenCalledTimes(1);
            expect(gateway.updateChallengePoints).toHaveBeenCalledTimes(1);

            expect(gateway.updateChallengePoints).toHaveBeenCalledWith(
                CHALLENGE_ID,
                100,
            );

            expect(result).toEqual({
                ...challenge,
                points: 100,
            });
        });

        it('deve permitir reduzir a pontuação de um desafio', async () => {
            gateway.updateChallengePoints.mockResolvedValue({
                ...challenge,
                points: 20,
            });

            const result = await useCase.execute(CHALLENGE_ID, 20);

            expect(result.points).toBe(20);

            expect(gateway.updateChallengePoints).toHaveBeenCalledWith(
                CHALLENGE_ID,
                20,
            );
        });

        it('deve permitir manter a pontuação atual', async () => {
            gateway.updateChallengePoints.mockResolvedValue(challenge);

            const result = await useCase.execute(CHALLENGE_ID, 40);

            expect(result).toEqual(challenge);

            expect(gateway.updateChallengePoints).toHaveBeenCalledWith(
                CHALLENGE_ID,
                40,
            );
        });

        it('deve utilizar o identificador recebido na atualização', async () => {
            await useCase.execute('challenge-2', 80);

            expect(gateway.findChallengeById).toHaveBeenCalledWith(
                'challenge-2',
            );

            expect(gateway.updateChallengePoints).toHaveBeenCalledWith(
                'challenge-2',
                80,
            );
        });

        it('deve retornar exatamente o desafio atualizado pelo gateway', async () => {
            const updatedChallenge: TChallenge = {
                id: 'challenge-2',
                name: 'Desafio Avançado',
                iri: 'https://gamapi.dev/challenges/avancado',
                points: 150,
                active: true,
            };

            gateway.updateChallengePoints.mockResolvedValue(updatedChallenge);

            const result = await useCase.execute(CHALLENGE_ID, 150);

            expect(result).toBe(updatedChallenge);
        });

        it('deve propagar falhas durante a atualização', async () => {
            const error = new Error('Falha ao atualizar pontuação.');

            gateway.updateChallengePoints.mockRejectedValue(error);

            await expect(useCase.execute(CHALLENGE_ID, 100)).rejects.toBe(
                error,
            );

            expect(gateway.updateChallengePoints).toHaveBeenCalledTimes(1);
        });
    });
});
