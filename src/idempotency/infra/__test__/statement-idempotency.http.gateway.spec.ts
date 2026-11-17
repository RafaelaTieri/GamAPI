import type { HttpService } from '@nestjs/axios';
import { BadGatewayException } from '@nestjs/common';
import { of, throwError } from 'rxjs';

import type { TXApiStatement } from '../../../statements/domain/statements.entities';
import { XAPI_VERBS } from '../../../xapi/domain/xapi.constants';
import { StatementIdempotencyHttpGateway } from '../statement-idempotency.http.gateway';

jest.mock('@nestjs/axios', () => ({
    HttpService: class HttpService {},
}));

describe('StatementIdempotencyHttpGateway', () => {
    const BASE_URL = 'https://ralph.example.com';
    const STATEMENTS_URL = `${BASE_URL}/xAPI/statements/`;
    const MBOX = 'mailto:aluno@email.com';

    const originalEnvironment = {
        LRS_URL: process.env.LRS_URL,
        LRS_USERNAME: process.env.LRS_USERNAME,
        LRS_PASSWORD: process.env.LRS_PASSWORD,
    };

    const statement = (id: string = 'statement-1'): TXApiStatement => ({
        id,
        actor: { mbox: MBOX, name: 'Aluno' },
        verb: { id: XAPI_VERBS.COMPLETED },
        object: { id: 'https://gamapi.dev/challenges/ux' },
    });

    const axiosError = (status: number): Error =>
        Object.assign(new Error(`Erro HTTP ${status}`), {
            isAxiosError: true,
            response: { status },
        });

    let gateway: StatementIdempotencyHttpGateway;
    let http: {
        get: jest.Mock;
        post: jest.Mock;
    };

    beforeEach(() => {
        process.env.LRS_URL = `${BASE_URL}/`;
        process.env.LRS_USERNAME = 'ralph-user';
        process.env.LRS_PASSWORD = 'ralph-password';

        http = {
            get: jest.fn(),
            post: jest.fn(),
        };
        gateway = new StatementIdempotencyHttpGateway(
            http as unknown as HttpService,
        );
    });

    afterAll(() => {
        for (const [key, value] of Object.entries(originalEnvironment)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    });

    describe('getById', () => {
        it('deve consultar o Ralph por statementId com autenticação e cabeçalho xAPI', async () => {
            const stored = statement();
            http.get.mockReturnValue(of({ data: stored }));

            await expect(gateway.getById(stored.id)).resolves.toEqual(stored);
            expect(http.get).toHaveBeenCalledTimes(1);
            expect(http.get).toHaveBeenCalledWith(STATEMENTS_URL, {
                auth: {
                    username: 'ralph-user',
                    password: 'ralph-password',
                },
                headers: { 'X-Experience-API-Version': '2.0.0' },
                timeout: 10000,
                params: { statementId: stored.id },
            });
        });

        it('deve retornar statement encontrado dentro da lista', async () => {
            const expected = statement('expected');
            http.get.mockReturnValue(
                of({
                    data: {
                        statements: [statement('other'), expected],
                    },
                }),
            );

            await expect(gateway.getById('expected')).resolves.toBe(expected);
        });

        it('deve retornar null quando não houver statement correspondente na lista', async () => {
            http.get.mockReturnValue(
                of({
                    data: { statements: [statement('other')] },
                }),
            );

            await expect(gateway.getById('missing')).resolves.toBeNull();
        });

        it('deve retornar null para lista vazia', async () => {
            http.get.mockReturnValue(of({ data: { statements: [] } }));

            await expect(gateway.getById('missing')).resolves.toBeNull();
        });

        it.each([null, 'texto', 42, [], true])(
            'deve rejeitar resposta raiz inválida: %p',
            async (data) => {
                http.get.mockReturnValue(of({ data }));

                await expect(gateway.getById('statement-1')).rejects.toThrow(
                    'O Ralph retornou uma resposta inválida.',
                );
            },
        );

        it.each([null, 'texto', {}, 10])(
            'deve rejeitar lista statements que não é array: %p',
            async (statements) => {
                http.get.mockReturnValue(of({ data: { statements } }));

                await expect(gateway.getById('statement-1')).rejects.toThrow(
                    'O Ralph retornou uma lista inválida.',
                );
            },
        );

        it('deve ignorar itens da lista que não são registros', async () => {
            const expected = statement('statement-1');
            http.get.mockReturnValue(
                of({
                    data: { statements: [null, 12, 'texto', [], expected] },
                }),
            );

            await expect(gateway.getById('statement-1')).resolves.toBe(
                expected,
            );
        });

        it('deve rejeitar statement encontrado sem estrutura xAPI válida', async () => {
            http.get.mockReturnValue(
                of({
                    data: {
                        statements: [
                            {
                                id: 'statement-1',
                                actor: {},
                                verb: {},
                                object: {},
                            },
                        ],
                    },
                }),
            );

            await expect(gateway.getById('statement-1')).rejects.toThrow(
                'O Ralph retornou um statement xAPI inválido.',
            );
        });

        it.each([
            { caseName: 'ator ausente', changed: { actor: undefined } },
            { caseName: 'ator nulo', changed: { actor: null } },
            { caseName: 'ator array', changed: { actor: [] } },
            { caseName: 'mbox inválido', changed: { actor: { mbox: 123 } } },
            { caseName: 'verbo ausente', changed: { verb: undefined } },
            { caseName: 'verbo inválido', changed: { verb: { id: 2 } } },
            { caseName: 'objeto ausente', changed: { object: undefined } },
            { caseName: 'objeto inválido', changed: { object: { id: false } } },
        ])(
            'deve rejeitar $caseName em statement retornado',
            async ({ changed }) => {
                http.get.mockReturnValue(
                    of({
                        data: { ...statement(), ...changed },
                    }),
                );

                await expect(gateway.getById('statement-1')).rejects.toThrow(
                    BadGatewayException,
                );
            },
        );

        it('deve rejeitar statement direto com ID inesperado', async () => {
            http.get.mockReturnValue(of({ data: statement('other') }));

            await expect(gateway.getById('statement-1')).rejects.toThrow(
                'O Ralph retornou um statement xAPI inesperado.',
            );
        });

        it('deve rejeitar objeto que não contém statement nem lista', async () => {
            http.get.mockReturnValue(of({ data: { another: 'value' } }));

            await expect(gateway.getById('statement-1')).rejects.toThrow(
                BadGatewayException,
            );
        });

        it('deve retornar null quando o Ralph responder HTTP 404', async () => {
            http.get.mockReturnValue(throwError(() => axiosError(404)));

            await expect(gateway.getById('statement-1')).resolves.toBeNull();
        });

        it('deve propagar erro HTTP diferente de 404', async () => {
            const error = axiosError(503);
            http.get.mockReturnValue(throwError(() => error));

            await expect(gateway.getById('statement-1')).rejects.toBe(error);
        });

        it('deve propagar erro não Axios', async () => {
            const error = new Error('Falha de rede');
            http.get.mockReturnValue(throwError(() => error));

            await expect(gateway.getById('statement-1')).rejects.toBe(error);
        });

        it('deve propagar erro Axios sem status de resposta', async () => {
            const error = Object.assign(new Error('Sem resposta'), {
                isAxiosError: true,
            });
            http.get.mockReturnValue(throwError(() => error));

            await expect(gateway.getById('statement-1')).rejects.toBe(error);
        });
    });

    describe('getByActorAndVerb', () => {
        it('deve consultar a primeira página filtrando ator e verbo', async () => {
            const stored = statement();
            http.get.mockReturnValue(
                of({
                    data: { statements: [stored], more: '' },
                }),
            );

            await expect(
                gateway.getByActorAndVerb(MBOX, XAPI_VERBS.COMPLETED),
            ).resolves.toEqual([stored]);

            expect(http.get).toHaveBeenCalledWith(STATEMENTS_URL, {
                auth: {
                    username: 'ralph-user',
                    password: 'ralph-password',
                },
                headers: { 'X-Experience-API-Version': '2.0.0' },
                timeout: 10000,
                params: {
                    agent: JSON.stringify({ objectType: 'Agent', mbox: MBOX }),
                    verb: XAPI_VERBS.COMPLETED,
                },
            });
        });

        it('deve retornar lista vazia quando o Ralph não retornar statements', async () => {
            http.get.mockReturnValue(
                of({ data: { statements: [], more: '' } }),
            );

            await expect(
                gateway.getByActorAndVerb(MBOX, XAPI_VERBS.COMPLETED),
            ).resolves.toEqual([]);
        });

        it('deve reunir múltiplas páginas sem repetir filtros na segunda página', async () => {
            const page2 = `${STATEMENTS_URL}?page=2`;
            const first = statement('first');
            const second = statement('second');
            http.get
                .mockReturnValueOnce(
                    of({
                        data: {
                            statements: [first],
                            more: '/xAPI/statements/?page=2',
                        },
                    }),
                )
                .mockReturnValueOnce(
                    of({
                        data: { statements: [second], more: '' },
                    }),
                );

            await expect(
                gateway.getByActorAndVerb(MBOX, XAPI_VERBS.COMPLETED),
            ).resolves.toEqual([first, second]);

            expect(http.get).toHaveBeenCalledTimes(2);
            expect(http.get).toHaveBeenNthCalledWith(2, page2, {
                auth: {
                    username: 'ralph-user',
                    password: 'ralph-password',
                },
                headers: { 'X-Experience-API-Version': '2.0.0' },
                timeout: 10000,
                params: undefined,
            });
        });

        it('deve aceitar more como URL absoluta de mesma origem', async () => {
            http.get
                .mockReturnValueOnce(
                    of({
                        data: {
                            statements: [],
                            more: `${STATEMENTS_URL}?page=2`,
                        },
                    }),
                )
                .mockReturnValueOnce(
                    of({ data: { statements: [], more: '' } }),
                );

            await expect(
                gateway.getByActorAndVerb(MBOX, XAPI_VERBS.COMPLETED),
            ).resolves.toEqual([]);

            expect(http.get).toHaveBeenNthCalledWith(
                2,
                `${STATEMENTS_URL}?page=2`,
                {
                    auth: {
                        username: 'ralph-user',
                        password: 'ralph-password',
                    },
                    headers: { 'X-Experience-API-Version': '2.0.0' },
                    timeout: 10000,
                    params: undefined,
                },
            );
        });

        it('deve aceitar more relativo à raiz da origem', async () => {
            http.get
                .mockReturnValueOnce(
                    of({
                        data: {
                            statements: [],
                            more: 'xAPI/statements/?page=2',
                        },
                    }),
                )
                .mockReturnValueOnce(
                    of({ data: { statements: [], more: '' } }),
                );

            await gateway.getByActorAndVerb(MBOX, XAPI_VERBS.COMPLETED);

            expect(http.get).toHaveBeenCalledTimes(2);
        });

        it('deve rejeitar URL de paginação de outra origem', async () => {
            http.get.mockReturnValue(
                of({
                    data: {
                        statements: [],
                        more: 'https://malicious.example.com/xAPI/statements/',
                    },
                }),
            );

            await expect(
                gateway.getByActorAndVerb(MBOX, XAPI_VERBS.COMPLETED),
            ).rejects.toThrow('Ralph retornou uma URL de paginação externa.');
            expect(http.get).toHaveBeenCalledTimes(1);
        });

        it('deve rejeitar ciclo de paginação', async () => {
            http.get.mockReturnValue(
                of({
                    data: { statements: [], more: '/xAPI/statements/' },
                }),
            );

            await expect(
                gateway.getByActorAndVerb(MBOX, XAPI_VERBS.COMPLETED),
            ).rejects.toThrow('Paginação circular retornada pelo Ralph.');
            expect(http.get).toHaveBeenCalledTimes(1);
        });

        it('deve rejeitar ciclo entre páginas diferentes', async () => {
            http.get
                .mockReturnValueOnce(
                    of({
                        data: {
                            statements: [],
                            more: '/xAPI/statements/?page=2',
                        },
                    }),
                )
                .mockReturnValueOnce(
                    of({
                        data: {
                            statements: [],
                            more: '/xAPI/statements/?page=2',
                        },
                    }),
                );

            await expect(
                gateway.getByActorAndVerb(MBOX, XAPI_VERBS.COMPLETED),
            ).rejects.toThrow('Paginação circular retornada pelo Ralph.');
            expect(http.get).toHaveBeenCalledTimes(2);
        });

        it('deve propagar falha durante a segunda página', async () => {
            const error = new Error('Segunda página indisponível');
            http.get
                .mockReturnValueOnce(
                    of({
                        data: {
                            statements: [],
                            more: '/xAPI/statements/?page=2',
                        },
                    }),
                )
                .mockReturnValueOnce(throwError(() => error));

            await expect(
                gateway.getByActorAndVerb(MBOX, XAPI_VERBS.COMPLETED),
            ).rejects.toBe(error);
        });
    });

    describe('create', () => {
        it('deve enviar o statement ao endpoint do Ralph', async () => {
            const submitted = statement();
            http.post.mockReturnValue(of({ data: undefined }));

            await expect(gateway.create(submitted)).resolves.toBeUndefined();
            expect(http.post).toHaveBeenCalledTimes(1);
            expect(http.post).toHaveBeenCalledWith(STATEMENTS_URL, submitted, {
                auth: {
                    username: 'ralph-user',
                    password: 'ralph-password',
                },
                headers: { 'X-Experience-API-Version': '2.0.0' },
                timeout: 10000,
            });
        });

        it('deve propagar erros no envio do statement', async () => {
            const error = new Error('Ralph indisponível');
            http.post.mockReturnValue(throwError(() => error));

            await expect(gateway.create(statement())).rejects.toBe(error);
        });
    });

    describe('Configuração do cliente HTTP', () => {
        it('deve usar credenciais vazias quando não configuradas', async () => {
            delete process.env.LRS_USERNAME;
            delete process.env.LRS_PASSWORD;
            http.post.mockReturnValue(of({ data: undefined }));

            await gateway.create(statement());

            expect(http.post).toHaveBeenCalledWith(
                STATEMENTS_URL,
                statement(),
                {
                    auth: { username: '', password: '' },
                    headers: { 'X-Experience-API-Version': '2.0.0' },
                    timeout: 10000,
                },
            );
        });

        it('deve utilizar URL base vazia quando LRS_URL não estiver configurada', async () => {
            delete process.env.LRS_URL;
            gateway = new StatementIdempotencyHttpGateway(
                http as unknown as HttpService,
            );
            http.post.mockReturnValue(of({ data: undefined }));

            await gateway.create(statement());

            expect(http.post).toHaveBeenCalledWith(
                '/xAPI/statements/',
                statement(),
                {
                    auth: {
                        username: 'ralph-user',
                        password: 'ralph-password',
                    },
                    headers: { 'X-Experience-API-Version': '2.0.0' },
                    timeout: 10000,
                },
            );
        });

        it('deve preservar URL base sem barra final', async () => {
            process.env.LRS_URL = BASE_URL;
            gateway = new StatementIdempotencyHttpGateway(
                http as unknown as HttpService,
            );
            http.post.mockReturnValue(of({ data: undefined }));

            await gateway.create(statement());

            expect(http.post).toHaveBeenCalledWith(
                STATEMENTS_URL,
                statement(),
                {
                    auth: {
                        username: 'ralph-user',
                        password: 'ralph-password',
                    },
                    headers: { 'X-Experience-API-Version': '2.0.0' },
                    timeout: 10000,
                },
            );
        });
    });
});
