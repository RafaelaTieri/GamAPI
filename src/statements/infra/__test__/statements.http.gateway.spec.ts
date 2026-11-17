import type { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';

import { XAPI_VERBS } from '../../../xapi/domain/xapi.constants';

import type {
    TXApiStatement,
    TXApiStatementResult,
} from '../../domain/statements.entities';
import { StatementHttpGateway } from '../statements.http.gateway';

jest.mock('@nestjs/axios', () => ({
    HttpService: class HttpService {},
}));

describe('StatementHttpGateway', () => {
    const url = 'https://ralph.example.com';
    const endpoint = `${url}/xAPI/statements/`;
    const mbox = 'mailto:aluno@example.com';
    const completedVerb = XAPI_VERBS.COMPLETED;
    const pointsVerb = XAPI_VERBS.EARNED_POINTS;
    const initialEnvironment = {
        LRS_URL: process.env.LRS_URL,
        LRS_USERNAME: process.env.LRS_USERNAME,
        LRS_PASSWORD: process.env.LRS_PASSWORD,
    };

    const requestConfig = {
        auth: {
            username: 'lrs-user',
            password: 'lrs-password',
        },
        headers: {
            'Content-Type': 'application/json',
            'X-Experience-API-Version': '2.0.0',
        },
    };

    const statement: TXApiStatement = {
        id: 'statement-1',
        actor: { name: 'Aluno', mbox },
        verb: { id: completedVerb },
        object: { id: 'https://gamapi.dev/challenges/1' },
    };
    const secondStatement: TXApiStatement = {
        ...statement,
        id: 'statement-2',
    };
    const thirdStatement: TXApiStatement = {
        ...statement,
        id: 'statement-3',
    };

    let getMock: jest.Mock;
    let postMock: jest.Mock;
    let gateway: StatementHttpGateway;

    const restoreEnvironmentValue = (
        key: 'LRS_URL' | 'LRS_USERNAME' | 'LRS_PASSWORD',
        value: string | undefined,
    ): void => {
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    };

    const response = (data: TXApiStatementResult) => of({ data });

    beforeEach(() => {
        process.env.LRS_URL = url;
        process.env.LRS_USERNAME = 'lrs-user';
        process.env.LRS_PASSWORD = 'lrs-password';

        getMock = jest.fn();
        postMock = jest.fn();

        gateway = new StatementHttpGateway({
            get: getMock,
            post: postMock,
        } as unknown as HttpService);
    });

    afterEach(() => {
        restoreEnvironmentValue('LRS_URL', initialEnvironment.LRS_URL);
        restoreEnvironmentValue(
            'LRS_USERNAME',
            initialEnvironment.LRS_USERNAME,
        );
        restoreEnvironmentValue(
            'LRS_PASSWORD',
            initialEnvironment.LRS_PASSWORD,
        );
    });

    describe('create', () => {
        it('deve enviar o statement ao Ralph e retornar o objeto original', async () => {
            postMock.mockReturnValue(of({ data: null }));

            const result = await gateway.create(statement);

            expect(result).toBe(statement);
            expect(postMock).toHaveBeenCalledTimes(1);
            expect(postMock).toHaveBeenCalledWith(
                endpoint,
                statement,
                requestConfig,
            );
            expect(getMock).not.toHaveBeenCalled();
        });

        it('deve aguardar a resposta do Ralph', async () => {
            postMock.mockReturnValue(of({ data: { id: 'outro-id' } }));

            await expect(gateway.create(statement)).resolves.toBe(statement);
        });

        it('deve propagar falhas na criação', async () => {
            const error = new Error('Falha ao salvar statement.');
            postMock.mockReturnValue(throwError(() => error));

            await expect(gateway.create(statement)).rejects.toBe(error);
        });
    });

    describe('getById', () => {
        it('deve consultar o ID e retornar o statement', async () => {
            getMock.mockReturnValue(of({ data: statement }));

            const result = await gateway.getById(statement.id);

            expect(result).toBe(statement);
            expect(getMock).toHaveBeenCalledTimes(1);
            expect(getMock).toHaveBeenCalledWith(endpoint, {
                ...requestConfig,
                params: { statementId: statement.id },
            });
        });

        it('deve consultar identificadores diferentes', async () => {
            getMock.mockReturnValue(of({ data: secondStatement }));

            await expect(gateway.getById('statement-2')).resolves.toBe(
                secondStatement,
            );
            expect(getMock).toHaveBeenCalledWith(endpoint, {
                ...requestConfig,
                params: { statementId: 'statement-2' },
            });
        });

        it('deve propagar erros da consulta HTTP', async () => {
            const error = new Error('Ralph indisponível.');
            getMock.mockReturnValue(throwError(() => error));

            await expect(gateway.getById(statement.id)).rejects.toBe(error);
        });
    });

    describe('getPointsByActor', () => {
        it('deve buscar as recompensas de pontos do participante', async () => {
            const pointsStatement: TXApiStatement = {
                ...statement,
                verb: { id: pointsVerb },
            };
            getMock.mockReturnValue(
                response({ statements: [pointsStatement] }),
            );

            const result = await gateway.getPointsByActor(mbox);

            expect(result).toEqual({ statements: [pointsStatement] });
            expect(getMock).toHaveBeenCalledTimes(1);
            expect(getMock).toHaveBeenCalledWith(endpoint, {
                ...requestConfig,
                params: {
                    agent: JSON.stringify({ mbox }),
                    verb: pointsVerb,
                },
            });
        });

        it('deve retornar uma lista vazia quando não houver recompensas', async () => {
            getMock.mockReturnValue(response({ statements: [] }));

            await expect(gateway.getPointsByActor(mbox)).resolves.toEqual({
                statements: [],
            });
        });
    });

    describe('getAllStatementsByActor', () => {
        it('deve consultar os statements de conclusão do participante', async () => {
            getMock.mockReturnValue(response({ statements: [statement] }));

            const result = await gateway.getAllStatementsByActor(mbox);

            expect(result).toEqual({ statements: [statement] });
            expect(getMock).toHaveBeenCalledTimes(1);
            expect(getMock).toHaveBeenCalledWith(endpoint, {
                ...requestConfig,
                params: {
                    agent: JSON.stringify({ mbox }),
                    verb: completedVerb,
                },
            });
        });

        it('deve devolver uma lista vazia quando não houver conclusões', async () => {
            getMock.mockReturnValue(response({ statements: [] }));

            await expect(
                gateway.getAllStatementsByActor(mbox),
            ).resolves.toEqual({
                statements: [],
            });
        });

        it('deve propagar erro da primeira página', async () => {
            const error = new Error('Erro ao consultar histórico.');
            getMock.mockReturnValue(throwError(() => error));

            await expect(gateway.getAllStatementsByActor(mbox)).rejects.toBe(
                error,
            );
        });
    });

    describe('Paginação', () => {
        it('deve unir os statements de duas páginas', async () => {
            getMock
                .mockReturnValueOnce(
                    response({
                        statements: [statement],
                        more: '/xAPI/statements/?page=2',
                    }),
                )
                .mockReturnValueOnce(
                    response({ statements: [secondStatement] }),
                );

            const result = await gateway.getAllStatementsByActor(mbox);

            expect(result).toEqual({
                statements: [statement, secondStatement],
            });
            expect(getMock).toHaveBeenCalledTimes(2);
            expect(getMock).toHaveBeenNthCalledWith(1, endpoint, {
                ...requestConfig,
                params: {
                    agent: JSON.stringify({ mbox }),
                    verb: completedVerb,
                },
            });
            expect(getMock).toHaveBeenNthCalledWith(
                2,
                `${endpoint}?page=2`,
                requestConfig,
            );
        });

        it('deve unir três páginas e preservar a ordem', async () => {
            getMock
                .mockReturnValueOnce(
                    response({
                        statements: [statement],
                        more: '/xAPI/statements/?page=2',
                    }),
                )
                .mockReturnValueOnce(
                    response({
                        statements: [secondStatement],
                        more: '/xAPI/statements/?page=3',
                    }),
                )
                .mockReturnValueOnce(
                    response({ statements: [thirdStatement] }),
                );

            const result = await gateway.getAllStatementsByActor(mbox);

            expect(result.statements).toEqual([
                statement,
                secondStatement,
                thirdStatement,
            ]);
            expect(getMock).toHaveBeenCalledTimes(3);
            expect(getMock).toHaveBeenNthCalledWith(
                3,
                `${endpoint}?page=3`,
                requestConfig,
            );
        });

        it('deve consultar uma página seguinte usando URL absoluta', async () => {
            const absoluteUrl = `${endpoint}?cursor=abc`;
            getMock
                .mockReturnValueOnce(
                    response({ statements: [], more: absoluteUrl }),
                )
                .mockReturnValueOnce(response({ statements: [statement] }));

            const result = await gateway.getPointsByActor(mbox);

            expect(result.statements).toEqual([statement]);
            expect(getMock).toHaveBeenNthCalledWith(
                2,
                absoluteUrl,
                requestConfig,
            );
        });

        it('deve consultar uma página seguinte usando caminho relativo', async () => {
            getMock
                .mockReturnValueOnce(
                    response({
                        statements: [],
                        more: 'xAPI/statements/?page=2',
                    }),
                )
                .mockReturnValueOnce(response({ statements: [statement] }));

            const result = await gateway.getAllStatementsByActor(mbox);

            expect(result.statements).toEqual([statement]);
            expect(getMock).toHaveBeenNthCalledWith(
                2,
                `${endpoint}?page=2`,
                requestConfig,
            );
        });

        it('deve terminar a paginação quando more for uma string vazia', async () => {
            getMock.mockReturnValue(
                response({
                    statements: [statement],
                    more: '',
                }),
            );

            const result = await gateway.getAllStatementsByActor(mbox);

            expect(result).toEqual({ statements: [statement] });
            expect(getMock).toHaveBeenCalledTimes(1);
        });

        it('deve preservar listas vazias entre páginas', async () => {
            getMock
                .mockReturnValueOnce(
                    response({
                        statements: [],
                        more: '/xAPI/statements/?page=2',
                    }),
                )
                .mockReturnValueOnce(response({ statements: [] }));

            await expect(
                gateway.getAllStatementsByActor(mbox),
            ).resolves.toEqual({
                statements: [],
            });
        });

        it('deve propagar falhas durante a consulta da próxima página', async () => {
            const error = new Error('Falha na segunda página.');
            getMock
                .mockReturnValueOnce(
                    response({
                        statements: [statement],
                        more: '/xAPI/statements/?page=2',
                    }),
                )
                .mockReturnValueOnce(throwError(() => error));

            await expect(gateway.getAllStatementsByActor(mbox)).rejects.toBe(
                error,
            );
        });

        it('deve propagar uma URL de paginação inválida', async () => {
            getMock.mockReturnValueOnce(
                response({ statements: [], more: 'http://[' }),
            );

            await expect(gateway.getAllStatementsByActor(mbox)).rejects.toThrow(
                'Invalid URL',
            );
            expect(getMock).toHaveBeenCalledTimes(1);
        });
    });

    describe('Configuração do LRS', () => {
        it('deve rejeitar a ausência de LRS_URL', async () => {
            delete process.env.LRS_URL;

            await expect(gateway.create(statement)).rejects.toThrow(
                'Configurações de conexão com o LRS não informadas.',
            );
            expect(postMock).not.toHaveBeenCalled();
        });

        it('deve rejeitar a ausência do usuário', async () => {
            delete process.env.LRS_USERNAME;

            await expect(gateway.getById(statement.id)).rejects.toThrow(
                'Configurações de conexão com o LRS não informadas.',
            );
            expect(getMock).not.toHaveBeenCalled();
        });

        it('deve rejeitar a ausência da senha', async () => {
            delete process.env.LRS_PASSWORD;

            await expect(gateway.getAllStatementsByActor(mbox)).rejects.toThrow(
                'Configurações de conexão com o LRS não informadas.',
            );
            expect(getMock).not.toHaveBeenCalled();
        });

        it('deve rejeitar credenciais vazias', async () => {
            process.env.LRS_USERNAME = '';

            await expect(gateway.getPointsByActor(mbox)).rejects.toThrow(
                'Configurações de conexão com o LRS não informadas.',
            );
        });

        it('deve usar as credenciais e URL configuradas no ambiente', async () => {
            process.env.LRS_URL = 'https://outro-ralph.example.com/';
            process.env.LRS_USERNAME = 'outro-usuario';
            process.env.LRS_PASSWORD = 'outra-senha';
            getMock.mockReturnValue(of({ data: statement }));

            await gateway.getById('statement-1');

            expect(getMock).toHaveBeenCalledWith(
                'https://outro-ralph.example.com//xAPI/statements/',
                {
                    auth: {
                        username: 'outro-usuario',
                        password: 'outra-senha',
                    },
                    headers: requestConfig.headers,
                    params: { statementId: 'statement-1' },
                },
            );
        });
    });
});
