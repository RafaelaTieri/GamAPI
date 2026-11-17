import { BadRequestException, NotFoundException } from '@nestjs/common';

import type { TXApiStatement } from '../../../statements/domain/statements.entities';
import {
    XAPI_ACTIVITY_TYPES,
    XAPI_VERBS,
} from '../../../xapi/domain/xapi.constants';
import type { GetChallengePointsUseCase } from '../../application/get-challenge-points.use.case';
import { ChallengesController } from '../challenge.controller';

describe('ChallengesController', () => {
    let controller: ChallengesController;

    let getChallengePointsUseCase: {
        execute: jest.Mock;
    };

    const CHALLENGE_IRI = 'https://gamapi.dev/challenges/ux';
    const PROJECT_IRI = 'https://gamapi.dev/projects/ux';
    const APPLICATION_IRI = 'https://gamapi.dev/applications/teste';

    const createStatement = (
        overrides: Partial<TXApiStatement> = {},
    ): TXApiStatement => ({
        id: 'statement-1',
        actor: {
            name: 'Aluno Teste',
            mbox: 'mailto:aluno@email.com',
        },
        verb: {
            id: XAPI_VERBS.COMPLETED,
        },
        object: {
            id: CHALLENGE_IRI,
            objectType: 'Activity',
            definition: {
                type: XAPI_ACTIVITY_TYPES.CHALLENGE,
            },
        },
        context: {
            contextActivities: {
                grouping: [
                    {
                        id: APPLICATION_IRI,
                        definition: {
                            type: XAPI_ACTIVITY_TYPES.EDUCATIONAL_APPLICATION,
                        },
                    },
                    {
                        id: PROJECT_IRI,
                        definition: {
                            type: XAPI_ACTIVITY_TYPES.PROJECT,
                        },
                    },
                ],
            },
        },
        ...overrides,
    });

    beforeEach(() => {
        getChallengePointsUseCase = {
            execute: jest.fn().mockResolvedValue(40),
        };

        controller = new ChallengesController(
            getChallengePointsUseCase as unknown as GetChallengePointsUseCase,
        );
    });

    describe('getPoints', () => {
        it('deve encaminhar o statement ao Use Case', async () => {
            const statement = createStatement();

            await controller.getPoints(statement);

            expect(getChallengePointsUseCase.execute).toHaveBeenCalledTimes(1);

            expect(getChallengePointsUseCase.execute).toHaveBeenCalledWith(
                statement,
            );
        });

        it('deve retornar a pontuação calculada pelo Use Case', async () => {
            const statement = createStatement();

            const result = await controller.getPoints(statement);

            expect(result).toEqual({
                points: 40,
            });
        });

        it('deve retornar zero quando o desafio vale zero pontos', async () => {
            getChallengePointsUseCase.execute.mockResolvedValue(0);

            const result = await controller.getPoints(createStatement());

            expect(result).toEqual({
                points: 0,
            });
        });

        it('deve retornar pontuações diferentes conforme o Use Case', async () => {
            getChallengePointsUseCase.execute
                .mockResolvedValueOnce(20)
                .mockResolvedValueOnce(100);

            const firstResult = await controller.getPoints(createStatement());

            const secondResult = await controller.getPoints(
                createStatement({
                    object: {
                        id: 'https://gamapi.dev/challenges/avancado',
                    },
                }),
            );

            expect(firstResult).toEqual({
                points: 20,
            });

            expect(secondResult).toEqual({
                points: 100,
            });

            expect(getChallengePointsUseCase.execute).toHaveBeenCalledTimes(2);
        });

        it('deve preservar o statement original enviado ao Use Case', async () => {
            const statement = createStatement();

            await controller.getPoints(statement);

            const mockCalls = getChallengePointsUseCase.execute.mock
                .calls as unknown[][];
            const receivedStatement = mockCalls[0][0];

            expect(receivedStatement).toBe(statement);
            expect(receivedStatement).toEqual(statement);
        });

        it('deve encaminhar um statement com contexto diferente', async () => {
            const statement = createStatement({
                context: {
                    contextActivities: {
                        grouping: [
                            {
                                id: 'https://gamapi.dev/applications/outra',
                                definition: {
                                    type: XAPI_ACTIVITY_TYPES.EDUCATIONAL_APPLICATION,
                                },
                            },
                            {
                                id: 'https://gamapi.dev/projects/outro',
                                definition: {
                                    type: XAPI_ACTIVITY_TYPES.PROJECT,
                                },
                            },
                        ],
                    },
                },
            });

            await controller.getPoints(statement);

            expect(getChallengePointsUseCase.execute).toHaveBeenCalledWith(
                statement,
            );
        });

        it('deve propagar BadRequestException para contexto inválido', async () => {
            getChallengePointsUseCase.execute.mockRejectedValue(
                new BadRequestException('Contexto do statement inválido.'),
            );

            await expect(
                controller.getPoints(
                    createStatement({
                        context: undefined,
                    }),
                ),
            ).rejects.toThrow(BadRequestException);

            expect(getChallengePointsUseCase.execute).toHaveBeenCalledTimes(1);
        });

        it('deve preservar a mensagem de contexto inválido', async () => {
            getChallengePointsUseCase.execute.mockRejectedValue(
                new BadRequestException('Contexto do statement inválido.'),
            );

            await expect(
                controller.getPoints(createStatement()),
            ).rejects.toThrow('Contexto do statement inválido.');
        });

        it('deve propagar NotFoundException para desafio inexistente', async () => {
            getChallengePointsUseCase.execute.mockRejectedValue(
                new NotFoundException('Desafio não encontrado.'),
            );

            await expect(
                controller.getPoints(createStatement()),
            ).rejects.toThrow(NotFoundException);

            expect(getChallengePointsUseCase.execute).toHaveBeenCalledTimes(1);
        });

        it('deve preservar a mensagem de desafio não encontrado', async () => {
            getChallengePointsUseCase.execute.mockRejectedValue(
                new NotFoundException('Desafio não encontrado.'),
            );

            await expect(
                controller.getPoints(createStatement()),
            ).rejects.toThrow('Desafio não encontrado.');
        });

        it('deve propagar falhas inesperadas do Use Case', async () => {
            getChallengePointsUseCase.execute.mockRejectedValue(
                new Error('Falha ao consultar o banco de dados.'),
            );

            await expect(
                controller.getPoints(createStatement()),
            ).rejects.toThrow('Falha ao consultar o banco de dados.');
        });

        it('não deve modificar os dados do statement recebido', async () => {
            const statement = createStatement();

            const originalData = structuredClone(statement);

            await controller.getPoints(statement);

            expect(statement).toEqual(originalData);
        });
    });
});
