import {
    BadRequestException,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';

import type {
    TChallenge,
    TCreateChallenge,
} from '../../../challenges/domain/challenge.entities';
import type { CreateChallengeUseCase } from '../../application/create-challenge.use.case';
import type { UpdateChallengePointsUseCase } from '../../application/update-challenge-points.use.case';
import { ChallengesConfigurationController } from '../challenges-configuration.controller';

describe('ChallengesConfigurationController', () => {
    let controller: ChallengesConfigurationController;

    let createChallengeUseCase: {
        execute: jest.Mock;
    };

    let updateChallengePointsUseCase: {
        execute: jest.Mock;
    };

    const CHALLENGE_ID = 'challenge-1';

    const validInput: TCreateChallenge = {
        name: 'Desafio de UX',
        iri: 'https://gamapi.dev/challenges/ux',
        points: 40,
    };

    const challenge: TChallenge = {
        id: CHALLENGE_ID,
        ...validInput,
        active: true,
    };

    beforeEach(() => {
        createChallengeUseCase = {
            execute: jest.fn().mockResolvedValue(challenge),
        };

        updateChallengePointsUseCase = {
            execute: jest.fn().mockResolvedValue({
                ...challenge,
                points: 100,
            }),
        };

        controller = new ChallengesConfigurationController(
            createChallengeUseCase as unknown as CreateChallengeUseCase,
            updateChallengePointsUseCase as unknown as UpdateChallengePointsUseCase,
        );
    });

    describe('create', () => {
        it('deve encaminhar os dados ao CreateChallengeUseCase', async () => {
            await controller.create(validInput);

            expect(createChallengeUseCase.execute).toHaveBeenCalledTimes(1);
            expect(createChallengeUseCase.execute).toHaveBeenCalledWith(
                validInput,
            );

            expect(updateChallengePointsUseCase.execute).not.toHaveBeenCalled();
        });

        it('deve retornar o desafio criado pelo Use Case', async () => {
            const result = await controller.create(validInput);

            expect(result).toBe(challenge);
        });

        it('deve permitir criar um desafio com zero pontos', async () => {
            const input: TCreateChallenge = {
                ...validInput,
                points: 0,
            };

            const createdChallenge: TChallenge = {
                ...challenge,
                points: 0,
            };

            createChallengeUseCase.execute.mockResolvedValue(createdChallenge);

            const result = await controller.create(input);

            expect(createChallengeUseCase.execute).toHaveBeenCalledWith(input);
            expect(result).toEqual(createdChallenge);
        });

        it('deve encaminhar os dados originais sem modificá-los', async () => {
            const input: TCreateChallenge = {
                name: '  Desafio de UX  ',
                iri: '  https://gamapi.dev/challenges/ux  ',
                points: 40,
            };

            const originalInput = { ...input };

            await controller.create(input);

            expect(createChallengeUseCase.execute).toHaveBeenCalledWith(input);
            expect(input).toEqual(originalInput);
        });

        it('deve encaminhar dados inválidos para validação do Use Case', async () => {
            const input: TCreateChallenge = {
                name: '',
                iri: '',
                points: -1,
            };

            await controller.create(input);

            expect(createChallengeUseCase.execute).toHaveBeenCalledWith(input);
        });

        it('deve propagar BadRequestException', async () => {
            createChallengeUseCase.execute.mockRejectedValue(
                new BadRequestException('Informe o nome e a IRI do desafio.'),
            );

            await expect(
                controller.create({
                    ...validInput,
                    name: '',
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it('deve propagar ConflictException', async () => {
            createChallengeUseCase.execute.mockRejectedValue(
                new ConflictException('Desafio já cadastrado.'),
            );

            await expect(controller.create(validInput)).rejects.toThrow(
                'Desafio já cadastrado.',
            );
        });

        it('deve preservar erros inesperados do Use Case', async () => {
            const error = new Error('Falha ao criar desafio.');

            createChallengeUseCase.execute.mockRejectedValue(error);

            await expect(controller.create(validInput)).rejects.toBe(error);
        });
    });

    describe('updatePoints', () => {
        it('deve encaminhar o ID e a pontuação ao Use Case', async () => {
            await controller.updatePoints(CHALLENGE_ID, 100);

            expect(updateChallengePointsUseCase.execute).toHaveBeenCalledTimes(
                1,
            );
            expect(updateChallengePointsUseCase.execute).toHaveBeenCalledWith(
                CHALLENGE_ID,
                100,
            );

            expect(createChallengeUseCase.execute).not.toHaveBeenCalled();
        });

        it('deve retornar o desafio atualizado', async () => {
            const result = await controller.updatePoints(CHALLENGE_ID, 100);

            expect(result).toEqual({
                ...challenge,
                points: 100,
            });
        });

        it('deve retornar exatamente o objeto do Use Case', async () => {
            const updatedChallenge: TChallenge = {
                ...challenge,
                points: 150,
            };

            updateChallengePointsUseCase.execute.mockResolvedValue(
                updatedChallenge,
            );

            const result = await controller.updatePoints(CHALLENGE_ID, 150);

            expect(result).toBe(updatedChallenge);
        });

        it('deve permitir atualizar a pontuação para zero', async () => {
            updateChallengePointsUseCase.execute.mockResolvedValue({
                ...challenge,
                points: 0,
            });

            const result = await controller.updatePoints(CHALLENGE_ID, 0);

            expect(updateChallengePointsUseCase.execute).toHaveBeenCalledWith(
                CHALLENGE_ID,
                0,
            );
            expect(result.points).toBe(0);
        });

        it('deve permitir reduzir a pontuação', async () => {
            updateChallengePointsUseCase.execute.mockResolvedValue({
                ...challenge,
                points: 10,
            });

            const result = await controller.updatePoints(CHALLENGE_ID, 10);

            expect(result.points).toBe(10);
        });

        it('deve utilizar o identificador recebido', async () => {
            await controller.updatePoints('challenge-2', 80);

            expect(updateChallengePointsUseCase.execute).toHaveBeenCalledWith(
                'challenge-2',
                80,
            );
        });

        it('deve encaminhar uma pontuação inválida para o Use Case', async () => {
            await controller.updatePoints(CHALLENGE_ID, -1);

            expect(updateChallengePointsUseCase.execute).toHaveBeenCalledWith(
                CHALLENGE_ID,
                -1,
            );
        });

        it('deve propagar BadRequestException', async () => {
            updateChallengePointsUseCase.execute.mockRejectedValue(
                new BadRequestException('Informe uma pontuação válida.'),
            );

            await expect(
                controller.updatePoints(CHALLENGE_ID, -1),
            ).rejects.toThrow(BadRequestException);
        });

        it('deve propagar NotFoundException', async () => {
            updateChallengePointsUseCase.execute.mockRejectedValue(
                new NotFoundException('Desafio não encontrado ou inativo.'),
            );

            await expect(
                controller.updatePoints('inexistente', 100),
            ).rejects.toThrow('Desafio não encontrado ou inativo.');
        });

        it('deve preservar erros inesperados do Use Case', async () => {
            const error = new Error('Falha ao atualizar pontuação.');

            updateChallengePointsUseCase.execute.mockRejectedValue(error);

            await expect(
                controller.updatePoints(CHALLENGE_ID, 100),
            ).rejects.toBe(error);
        });
    });
});
