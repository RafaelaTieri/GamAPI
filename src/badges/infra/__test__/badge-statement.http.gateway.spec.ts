import type { HttpService } from '@nestjs/axios';
import {
    BadGatewayException,
    InternalServerErrorException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';

import type {
    TXApiStatement,
    TXApiStatementResult,
} from '../../../statements/domain/statements.entities';
import { XAPI_VERBS } from '../../../xapi/domain/xapi.constants';
import { BadgeStatementHttpGateway } from '../badge-statement.http.gateway';

jest.mock('@nestjs/axios', () => ({
    HttpService: class HttpService {},
}));

describe('BadgeStatementHttpGateway', () => {
    const BASE_URL = 'http://localhost:8100';
    const ENDPOINT = `${BASE_URL}/xAPI/statements/`;
    const MBOX = 'mailto:aluno@email.com';
    const VERB = XAPI_VERBS.EARNED_BADGE;

    const originalEnv = {
        LRS_URL: process.env.LRS_URL,
        LRS_USERNAME: process.env.LRS_USERNAME,
        LRS_PASSWORD: process.env.LRS_PASSWORD,
    };

    const createStatement = (
        id: string,
        actorMbox: string = MBOX,
    ): TXApiStatement => ({
        id,
        actor: {
            name: 'Aluno Teste',
            mbox: actorMbox,
        },
        verb: { id: VERB },
        object: {
            id: 'https://gamapi.dev/badges/ux-master',
        },
    });

    const createPage = (
        statements: TXApiStatement[],
        more?: string,
    ): TXApiStatementResult => ({
        statements,
        more,
    });

    let gateway: BadgeStatementHttpGateway;
    let httpService: {
        get: jest.Mock;
        post: jest.Mock;
    };

    beforeEach(() => {
        process.env.LRS_URL = `${BASE_URL}/`;
        process.env.LRS_USERNAME = 'test-user';
        process.env.LRS_PASSWORD = 'test-password';

        httpService = {
            get: jest.fn(),
            post: jest.fn(),
        };

        gateway = new BadgeStatementHttpGateway(
            httpService as unknown as HttpService,
        );
    });

    afterAll(() => {
        for (const [name, value] of Object.entries(originalEnv)) {
            if (value === undefined) {
                delete process.env[name];
            } else {
                process.env[name] = value;
            }
        }
    });

    describe('getByActorAndVerb', () => {
        it('deve consultar statements com os parâmetros e credenciais corretos', async () => {
            const statement = createStatement('statement-1');

            httpService.get.mockReturnValue(
                of({ data: createPage([statement]) }),
            );

            const result = await gateway.getByActorAndVerb(MBOX, VERB);

            expect(result).toEqual([statement]);
            expect(httpService.get).toHaveBeenCalledTimes(1);
            expect(httpService.get).toHaveBeenCalledWith(ENDPOINT, {
                auth: {
                    username: 'test-user',
                    password: 'test-password',
                },
                headers: {
                    'X-Experience-API-Version': '2.0.0',
                },
                params: {
                    agent: JSON.stringify({
                        objectType: 'Agent',
                        mbox: MBOX,
                    }),
                    verb: VERB,
                },
            });
        });

        it('deve retornar lista vazia quando não existem statements', async () => {
            httpService.get.mockReturnValue(of({ data: createPage([], '') }));

            const result = await gateway.getByActorAndVerb(MBOX, VERB);

            expect(result).toEqual([]);
            expect(httpService.get).toHaveBeenCalledTimes(1);
        });

        it('deve ignorar statements de outros participantes', async () => {
            const expectedStatement = createStatement('statement-1');
            const otherStatement = createStatement(
                'statement-2',
                'mailto:outro@email.com',
            );

            httpService.get.mockReturnValue(
                of({
                    data: createPage([otherStatement, expectedStatement]),
                }),
            );

            const result = await gateway.getByActorAndVerb(MBOX, VERB);

            expect(result).toEqual([expectedStatement]);
        });

        it('deve retornar todas as conquistas do participante', async () => {
            const firstStatement = createStatement('statement-1');
            const secondStatement = createStatement('statement-2');

            httpService.get.mockReturnValue(
                of({
                    data: createPage([firstStatement, secondStatement]),
                }),
            );

            const result = await gateway.getByActorAndVerb(MBOX, VERB);

            expect(result).toEqual([firstStatement, secondStatement]);
        });

        it('deve consultar todas as páginas retornadas pelo Ralph', async () => {
            const firstStatement = createStatement('statement-1');
            const secondStatement = createStatement('statement-2');
            const thirdStatement = createStatement('statement-3');

            httpService.get
                .mockReturnValueOnce(
                    of({
                        data: createPage([firstStatement], '?cursor=page-2'),
                    }),
                )
                .mockReturnValueOnce(
                    of({
                        data: createPage([secondStatement], '?cursor=page-3'),
                    }),
                )
                .mockReturnValueOnce(
                    of({
                        data: createPage([thirdStatement], ''),
                    }),
                );

            const result = await gateway.getByActorAndVerb(MBOX, VERB);

            expect(result).toEqual([
                firstStatement,
                secondStatement,
                thirdStatement,
            ]);

            expect(httpService.get).toHaveBeenCalledTimes(3);

            expect(httpService.get).toHaveBeenNthCalledWith(
                2,
                `${ENDPOINT}?cursor=page-2`,
                expect.objectContaining({
                    params: undefined,
                }),
            );

            expect(httpService.get).toHaveBeenNthCalledWith(
                3,
                `${ENDPOINT}?cursor=page-3`,
                expect.objectContaining({
                    params: undefined,
                }),
            );
        });

        it('deve aceitar uma URL de paginação relativa', async () => {
            const statement = createStatement('statement-1');

            httpService.get
                .mockReturnValueOnce(
                    of({
                        data: createPage([], '/xAPI/statements/?cursor=next'),
                    }),
                )
                .mockReturnValueOnce(
                    of({
                        data: createPage([statement]),
                    }),
                );

            const result = await gateway.getByActorAndVerb(MBOX, VERB);

            expect(result).toEqual([statement]);
            expect(httpService.get).toHaveBeenNthCalledWith(
                2,
                `${ENDPOINT}?cursor=next`,
                expect.any(Object),
            );
        });

        it('deve detectar paginação circular', async () => {
            httpService.get.mockReturnValue(
                of({
                    data: createPage([], '/xAPI/statements/'),
                }),
            );

            await expect(gateway.getByActorAndVerb(MBOX, VERB)).rejects.toThrow(
                BadGatewayException,
            );

            expect(httpService.get).toHaveBeenCalledTimes(1);
        });

        it('deve rejeitar paginação para outro servidor', async () => {
            httpService.get.mockReturnValue(
                of({
                    data: createPage(
                        [],
                        'https://servidor-externo.com/xAPI/statements/',
                    ),
                }),
            );

            await expect(gateway.getByActorAndVerb(MBOX, VERB)).rejects.toThrow(
                'Paginação aponta para outro servidor.',
            );

            expect(httpService.get).toHaveBeenCalledTimes(1);
        });

        it('deve propagar erros de requisição ao Ralph', async () => {
            httpService.get.mockReturnValue(
                throwError(() => new Error('Ralph indisponível')),
            );

            await expect(gateway.getByActorAndVerb(MBOX, VERB)).rejects.toThrow(
                'Ralph indisponível',
            );
        });

        it('deve aceitar LRS_URL sem barra final', async () => {
            process.env.LRS_URL = BASE_URL;

            httpService.get.mockReturnValue(of({ data: createPage([]) }));

            await gateway.getByActorAndVerb(MBOX, VERB);

            expect(httpService.get).toHaveBeenCalledWith(
                ENDPOINT,
                expect.any(Object),
            );
        });

        it('deve rejeitar LRS_URL não configurada', async () => {
            delete process.env.LRS_URL;

            await expect(gateway.getByActorAndVerb(MBOX, VERB)).rejects.toThrow(
                InternalServerErrorException,
            );

            expect(httpService.get).not.toHaveBeenCalled();
        });

        it('deve rejeitar ausência de usuário do LRS', async () => {
            delete process.env.LRS_USERNAME;

            await expect(gateway.getByActorAndVerb(MBOX, VERB)).rejects.toThrow(
                'Credenciais do LRS não configuradas.',
            );

            expect(httpService.get).not.toHaveBeenCalled();
        });

        it('deve rejeitar ausência de senha do LRS', async () => {
            delete process.env.LRS_PASSWORD;

            await expect(gateway.getByActorAndVerb(MBOX, VERB)).rejects.toThrow(
                'Credenciais do LRS não configuradas.',
            );

            expect(httpService.get).not.toHaveBeenCalled();
        });
    });

    describe('create', () => {
        it('deve registrar um statement com autenticação correta', async () => {
            const statement = createStatement('statement-1');

            httpService.post.mockReturnValue(of({ status: 204, data: null }));

            await expect(gateway.create(statement)).resolves.toBeUndefined();

            expect(httpService.post).toHaveBeenCalledTimes(1);
            expect(httpService.post).toHaveBeenCalledWith(ENDPOINT, statement, {
                auth: {
                    username: 'test-user',
                    password: 'test-password',
                },
                headers: {
                    'X-Experience-API-Version': '2.0.0',
                },
            });
        });

        it('deve propagar falhas ao registrar um statement', async () => {
            httpService.post.mockReturnValue(
                throwError(() => new Error('Erro ao criar statement')),
            );

            await expect(
                gateway.create(createStatement('statement-1')),
            ).rejects.toThrow('Erro ao criar statement');
        });

        it('deve rejeitar criação sem LRS_URL', async () => {
            delete process.env.LRS_URL;

            await expect(
                gateway.create(createStatement('statement-1')),
            ).rejects.toThrow('LRS_URL não configurada.');

            expect(httpService.post).not.toHaveBeenCalled();
        });

        it('deve rejeitar criação sem credenciais', async () => {
            delete process.env.LRS_PASSWORD;

            await expect(
                gateway.create(createStatement('statement-1')),
            ).rejects.toThrow('Credenciais do LRS não configuradas.');

            expect(httpService.post).not.toHaveBeenCalled();
        });
    });
});
