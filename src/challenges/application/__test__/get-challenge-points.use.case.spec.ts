import { BadRequestException, NotFoundException } from '@nestjs/common';

import type { TXApiStatement } from '../../../statements/domain/statements.entities';
import {
    XAPI_ACTIVITY_TYPES,
    XAPI_VERBS,
} from '../../../xapi/domain/xapi.constants';
import type { TChallenge } from '../../domain/challenge.entities';
import { GetChallengePointsUseCase } from '../get-challenge-points.use.case';

describe('GetChallengePointsUseCase', () => {
    let useCase: GetChallengePointsUseCase;
    let gateway: {
        getByContext: jest.Mock;
    };

    const APPLICATION_IRI = 'https://gamapi.dev/applications/teste';
    const PROJECT_IRI = 'https://gamapi.dev/projects/ux';
    const CHALLENGE_IRI = 'https://gamapi.dev/challenges/testes-de-ux';

    const challenge: TChallenge = {
        id: 'challenge-1',
        name: 'Testes de UX',
        iri: CHALLENGE_IRI,
        points: 40,
        active: true,
    };

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
        gateway = {
            getByContext: jest.fn().mockResolvedValue(challenge),
        };

        useCase = new GetChallengePointsUseCase(gateway);
    });

    describe('Consulta da pontuação', () => {
        it('deve retornar os pontos do desafio encontrado', async () => {
            const result = await useCase.execute(createStatement());

            expect(result).toBe(40);

            expect(gateway.getByContext).toHaveBeenCalledWith({
                challengeIri: CHALLENGE_IRI,
                applicationIri: APPLICATION_IRI,
                projectIri: PROJECT_IRI,
            });

            expect(gateway.getByContext).toHaveBeenCalledTimes(1);
        });

        it('deve retornar zero quando o desafio vale zero pontos', async () => {
            gateway.getByContext.mockResolvedValue({
                ...challenge,
                points: 0,
            });

            const result = await useCase.execute(createStatement());

            expect(result).toBe(0);
        });

        it('deve retornar a pontuação configurada no gateway', async () => {
            gateway.getByContext.mockResolvedValue({
                ...challenge,
                points: 150,
            });

            const result = await useCase.execute(createStatement());

            expect(result).toBe(150);
        });

        it('deve utilizar a IRI do desafio presente no statement', async () => {
            const anotherChallengeIri =
                'https://gamapi.dev/challenges/outro-desafio';

            const statement = createStatement({
                object: {
                    id: anotherChallengeIri,
                },
            });

            await useCase.execute(statement);

            expect(gateway.getByContext).toHaveBeenCalledWith({
                challengeIri: anotherChallengeIri,
                applicationIri: APPLICATION_IRI,
                projectIri: PROJECT_IRI,
            });
        });

        it('deve identificar aplicação e projeto independentemente da ordem', async () => {
            const statement = createStatement({
                context: {
                    contextActivities: {
                        grouping: [
                            {
                                id: PROJECT_IRI,
                                definition: {
                                    type: XAPI_ACTIVITY_TYPES.PROJECT,
                                },
                            },
                            {
                                id: APPLICATION_IRI,
                                definition: {
                                    type: XAPI_ACTIVITY_TYPES.EDUCATIONAL_APPLICATION,
                                },
                            },
                        ],
                    },
                },
            });

            const result = await useCase.execute(statement);

            expect(result).toBe(40);

            expect(gateway.getByContext).toHaveBeenCalledWith({
                challengeIri: CHALLENGE_IRI,
                applicationIri: APPLICATION_IRI,
                projectIri: PROJECT_IRI,
            });
        });

        it('deve ignorar atividades de outros tipos', async () => {
            const statement = createStatement({
                context: {
                    contextActivities: {
                        grouping: [
                            {
                                id: 'https://gamapi.dev/activities/outra',
                                definition: {
                                    type: XAPI_ACTIVITY_TYPES.CHALLENGE,
                                },
                            },
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
            });

            await useCase.execute(statement);

            expect(gateway.getByContext).toHaveBeenCalledWith({
                challengeIri: CHALLENGE_IRI,
                applicationIri: APPLICATION_IRI,
                projectIri: PROJECT_IRI,
            });
        });

        it('deve ignorar atividades sem definition quando existem atividades válidas', async () => {
            const statement = createStatement({
                context: {
                    contextActivities: {
                        grouping: [
                            {
                                id: 'https://gamapi.dev/activities/sem-tipo',
                            },
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
            });

            await useCase.execute(statement);

            expect(gateway.getByContext).toHaveBeenCalledWith({
                challengeIri: CHALLENGE_IRI,
                applicationIri: APPLICATION_IRI,
                projectIri: PROJECT_IRI,
            });
        });
    });

    describe('Validação do contexto', () => {
        it('deve rejeitar statement sem contexto', async () => {
            const statement = createStatement({
                context: undefined,
            });

            await expect(useCase.execute(statement)).rejects.toThrow(
                BadRequestException,
            );

            expect(gateway.getByContext).not.toHaveBeenCalled();
        });

        it('deve rejeitar contexto sem contextActivities', async () => {
            const statement = createStatement({
                context: {},
            });

            await expect(useCase.execute(statement)).rejects.toThrow(
                'Contexto do statement inválido.',
            );

            expect(gateway.getByContext).not.toHaveBeenCalled();
        });

        it('deve rejeitar contextActivities sem grouping', async () => {
            const statement = createStatement({
                context: {
                    contextActivities: {},
                },
            });

            await expect(useCase.execute(statement)).rejects.toThrow(
                BadRequestException,
            );

            expect(gateway.getByContext).not.toHaveBeenCalled();
        });

        it('deve rejeitar grouping vazio', async () => {
            const statement = createStatement({
                context: {
                    contextActivities: {
                        grouping: [],
                    },
                },
            });

            await expect(useCase.execute(statement)).rejects.toThrow(
                'Contexto do statement inválido.',
            );

            expect(gateway.getByContext).not.toHaveBeenCalled();
        });

        it('deve rejeitar contexto sem aplicação educacional', async () => {
            const statement = createStatement({
                context: {
                    contextActivities: {
                        grouping: [
                            {
                                id: PROJECT_IRI,
                                definition: {
                                    type: XAPI_ACTIVITY_TYPES.PROJECT,
                                },
                            },
                        ],
                    },
                },
            });

            await expect(useCase.execute(statement)).rejects.toThrow(
                BadRequestException,
            );

            expect(gateway.getByContext).not.toHaveBeenCalled();
        });

        it('deve rejeitar contexto sem projeto', async () => {
            const statement = createStatement({
                context: {
                    contextActivities: {
                        grouping: [
                            {
                                id: APPLICATION_IRI,
                                definition: {
                                    type: XAPI_ACTIVITY_TYPES.EDUCATIONAL_APPLICATION,
                                },
                            },
                        ],
                    },
                },
            });

            await expect(useCase.execute(statement)).rejects.toThrow(
                BadRequestException,
            );

            expect(gateway.getByContext).not.toHaveBeenCalled();
        });

        it('deve rejeitar atividade da aplicação sem identificador', async () => {
            const statement = createStatement({
                context: {
                    contextActivities: {
                        grouping: [
                            {
                                id: '',
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
            });

            await expect(useCase.execute(statement)).rejects.toThrow(
                'Contexto do statement inválido.',
            );

            expect(gateway.getByContext).not.toHaveBeenCalled();
        });

        it('deve rejeitar atividade do projeto sem identificador', async () => {
            const statement = createStatement({
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
                                id: '',
                                definition: {
                                    type: XAPI_ACTIVITY_TYPES.PROJECT,
                                },
                            },
                        ],
                    },
                },
            });

            await expect(useCase.execute(statement)).rejects.toThrow(
                'Contexto do statement inválido.',
            );

            expect(gateway.getByContext).not.toHaveBeenCalled();
        });

        it('deve rejeitar atividades com tipos incorretos', async () => {
            const statement = createStatement({
                context: {
                    contextActivities: {
                        grouping: [
                            {
                                id: APPLICATION_IRI,
                                definition: {
                                    type: XAPI_ACTIVITY_TYPES.CHALLENGE,
                                },
                            },
                            {
                                id: PROJECT_IRI,
                                definition: {
                                    type: XAPI_ACTIVITY_TYPES.CHALLENGE,
                                },
                            },
                        ],
                    },
                },
            });

            await expect(useCase.execute(statement)).rejects.toThrow(
                BadRequestException,
            );

            expect(gateway.getByContext).not.toHaveBeenCalled();
        });

        it('deve rejeitar atividades sem definição de tipo', async () => {
            const statement = createStatement({
                context: {
                    contextActivities: {
                        grouping: [
                            {
                                id: APPLICATION_IRI,
                            },
                            {
                                id: PROJECT_IRI,
                            },
                        ],
                    },
                },
            });

            await expect(useCase.execute(statement)).rejects.toThrow(
                BadRequestException,
            );

            expect(gateway.getByContext).not.toHaveBeenCalled();
        });
    });

    describe('Desafio não encontrado', () => {
        it('deve lançar NotFoundException quando o desafio não existe', async () => {
            gateway.getByContext.mockResolvedValue(null);

            await expect(useCase.execute(createStatement())).rejects.toThrow(
                NotFoundException,
            );

            expect(gateway.getByContext).toHaveBeenCalledTimes(1);
        });

        it('deve retornar a mensagem correta para desafio inexistente', async () => {
            gateway.getByContext.mockResolvedValue(null);

            await expect(useCase.execute(createStatement())).rejects.toThrow(
                'Desafio não encontrado.',
            );
        });

        it('deve propagar falhas do gateway', async () => {
            gateway.getByContext.mockRejectedValue(
                new Error('Falha ao consultar o banco de dados.'),
            );

            await expect(useCase.execute(createStatement())).rejects.toThrow(
                'Falha ao consultar o banco de dados.',
            );
        });
    });
});
