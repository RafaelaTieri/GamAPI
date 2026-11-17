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
import { LeaderboardHttpGateway } from '../leaderboard.http.gateway';

jest.mock('@nestjs/axios', () => ({
    HttpService: class HttpService {},
}));

describe('LeaderboardHttpGateway', () => {
    const BASE_URL = 'https://lrs.example.com';
    const STATEMENTS_URL = `${BASE_URL}/xAPI/statements/`;
    const USERNAME = 'user-test';
    const PASSWORD = 'password-test';

    const previousEnvironment = {
        LRS_URL: process.env.LRS_URL,
        LRS_USERNAME: process.env.LRS_USERNAME,
        LRS_PASSWORD: process.env.LRS_PASSWORD,
    };

    const statement = (
        id: string,
        verb = XAPI_VERBS.COMPLETED,
    ): TXApiStatement => ({
        id,
        actor: { mbox: 'mailto:aluno@email.com' },
        verb: { id: verb },
        object: { id: `https://gamapi.dev/challenges/${id}` },
    });

    const page = (
        statements: TXApiStatement[],
        more = '',
    ): TXApiStatementResult => ({ statements, more });

    let gateway: LeaderboardHttpGateway;
    let getMock: jest.Mock;

    beforeEach(() => {
        process.env.LRS_URL = `${BASE_URL}/`;
        process.env.LRS_USERNAME = USERNAME;
        process.env.LRS_PASSWORD = PASSWORD;

        getMock = jest.fn().mockReturnValue(of({ data: page([]) }));

        gateway = new LeaderboardHttpGateway({
            get: getMock,
        } as unknown as HttpService);
    });

    afterAll(() => {
        for (const [name, value] of Object.entries(previousEnvironment)) {
            if (value === undefined) {
                delete process.env[name];
            } else {
                process.env[name] = value;
            }
        }
    });

    describe('configuração e consulta HTTP', () => {
        it('consulta a primeira página com verbo, autenticação e versão xAPI', async () => {
            const firstStatement = statement('c1');
            getMock.mockReturnValue(of({ data: page([firstStatement]) }));

            const result = await gateway.getByVerb(XAPI_VERBS.COMPLETED);

            expect(result).toEqual([firstStatement]);
            expect(getMock).toHaveBeenCalledTimes(1);
            expect(getMock).toHaveBeenCalledWith(STATEMENTS_URL, {
                params: { verb: XAPI_VERBS.COMPLETED },
                auth: { username: USERNAME, password: PASSWORD },
                headers: { 'X-Experience-API-Version': '2.0.0' },
            });
        });

        it('não acrescenta uma barra extra a uma URL que já termina em barra', async () => {
            await gateway.getByVerb(XAPI_VERBS.EARNED_POINTS);

            expect(getMock).toHaveBeenCalledWith(STATEMENTS_URL, {
                params: { verb: XAPI_VERBS.EARNED_POINTS },
                auth: { username: USERNAME, password: PASSWORD },
                headers: { 'X-Experience-API-Version': '2.0.0' },
            });
        });

        it('aceita LRS_URL sem barra final', async () => {
            process.env.LRS_URL = BASE_URL;

            await gateway.getByVerb(XAPI_VERBS.COMPLETED);

            expect(getMock).toHaveBeenCalledWith(STATEMENTS_URL, {
                params: { verb: XAPI_VERBS.COMPLETED },
                auth: { username: USERNAME, password: PASSWORD },
                headers: { 'X-Experience-API-Version': '2.0.0' },
            });
        });

        it('retorna lista vazia quando o Ralph não possui statements', async () => {
            const result = await gateway.getByVerb(XAPI_VERBS.COMPLETED);

            expect(result).toEqual([]);
            expect(getMock).toHaveBeenCalledTimes(1);
        });

        it('propaga erros HTTP', async () => {
            const error = new Error('Ralph indisponível');
            getMock.mockReturnValue(throwError(() => error));

            await expect(gateway.getByVerb(XAPI_VERBS.COMPLETED)).rejects.toBe(
                error,
            );
        });

        it('rejeita URL do LRS ausente antes de executar HTTP', async () => {
            delete process.env.LRS_URL;

            await expect(
                gateway.getByVerb(XAPI_VERBS.COMPLETED),
            ).rejects.toThrow(InternalServerErrorException);
            await expect(
                gateway.getByVerb(XAPI_VERBS.COMPLETED),
            ).rejects.toThrow('LRS_URL não configurada.');
            expect(getMock).not.toHaveBeenCalled();
        });

        it.each(['LRS_USERNAME', 'LRS_PASSWORD'])(
            'rejeita a credencial ausente %s',
            async (environmentKey) => {
                delete process.env[environmentKey];

                await expect(
                    gateway.getByVerb(XAPI_VERBS.COMPLETED),
                ).rejects.toThrow(InternalServerErrorException);
                await expect(
                    gateway.getByVerb(XAPI_VERBS.COMPLETED),
                ).rejects.toThrow('Credenciais do LRS não configuradas.');
                expect(getMock).not.toHaveBeenCalled();
            },
        );
    });

    describe('paginação', () => {
        it('reúne statements de várias páginas na ordem recebida', async () => {
            const first = statement('c1');
            const second = statement('c2');
            const third = statement('c3');
            const secondPage = `${STATEMENTS_URL}?page=2`;
            const thirdPage = `${STATEMENTS_URL}?page=3`;

            getMock
                .mockReturnValueOnce(of({ data: page([first], '?page=2') }))
                .mockReturnValueOnce(of({ data: page([second], '?page=3') }))
                .mockReturnValueOnce(of({ data: page([third]) }));

            const result = await gateway.getByVerb(XAPI_VERBS.COMPLETED);

            expect(result).toEqual([first, second, third]);
            expect(getMock).toHaveBeenCalledTimes(3);
            expect(getMock).toHaveBeenNthCalledWith(1, STATEMENTS_URL, {
                params: { verb: XAPI_VERBS.COMPLETED },
                auth: { username: USERNAME, password: PASSWORD },
                headers: { 'X-Experience-API-Version': '2.0.0' },
            });
            expect(getMock).toHaveBeenNthCalledWith(2, secondPage, {
                params: undefined,
                auth: { username: USERNAME, password: PASSWORD },
                headers: { 'X-Experience-API-Version': '2.0.0' },
            });
            expect(getMock).toHaveBeenNthCalledWith(3, thirdPage, {
                params: undefined,
                auth: { username: USERNAME, password: PASSWORD },
                headers: { 'X-Experience-API-Version': '2.0.0' },
            });
        });

        it('aceita uma URL absoluta de paginação no mesmo domínio', async () => {
            const nextPage = `${STATEMENTS_URL}?page=2`;
            getMock
                .mockReturnValueOnce(
                    of({ data: page([statement('c1')], nextPage) }),
                )
                .mockReturnValueOnce(of({ data: page([statement('c2')]) }));

            const result = await gateway.getByVerb(XAPI_VERBS.COMPLETED);

            expect(result.map((item) => item.id)).toEqual(['c1', 'c2']);
            expect(getMock).toHaveBeenNthCalledWith(2, nextPage, {
                params: undefined,
                auth: { username: USERNAME, password: PASSWORD },
                headers: { 'X-Experience-API-Version': '2.0.0' },
            });
        });

        it('aceita um caminho de paginação relativo à raiz', async () => {
            getMock
                .mockReturnValueOnce(
                    of({ data: page([], '/xAPI/statements/?page=2') }),
                )
                .mockReturnValueOnce(of({ data: page([statement('c2')]) }));

            const result = await gateway.getByVerb(XAPI_VERBS.COMPLETED);

            expect(result.map((item) => item.id)).toEqual(['c2']);
            expect(getMock).toHaveBeenNthCalledWith(
                2,
                `${STATEMENTS_URL}?page=2`,
                {
                    params: undefined,
                    auth: { username: USERNAME, password: PASSWORD },
                    headers: { 'X-Experience-API-Version': '2.0.0' },
                },
            );
        });

        it('rejeita uma URL de paginação de outro domínio', async () => {
            getMock.mockReturnValueOnce(
                of({
                    data: page([], 'https://evil.example.com/xAPI/statements/'),
                }),
            );

            await expect(
                gateway.getByVerb(XAPI_VERBS.COMPLETED),
            ).rejects.toThrow(BadGatewayException);
            expect(getMock).toHaveBeenCalledTimes(1);
        });

        it('rejeita uma URL externa definida com duas barras', async () => {
            getMock.mockReturnValueOnce(
                of({ data: page([], '//evil.example.com/xAPI/statements/') }),
            );

            await expect(
                gateway.getByVerb(XAPI_VERBS.COMPLETED),
            ).rejects.toThrow('Paginação aponta para um servidor diferente.');
        });

        it('rejeita paginação circular que retorna à primeira página', async () => {
            getMock.mockReturnValueOnce(
                of({ data: page([statement('c1')], '/xAPI/statements/') }),
            );

            await expect(
                gateway.getByVerb(XAPI_VERBS.COMPLETED),
            ).rejects.toThrow('Paginação inválida do Ralph.');
            expect(getMock).toHaveBeenCalledTimes(1);
        });

        it('rejeita paginação circular entre páginas posteriores', async () => {
            getMock
                .mockReturnValueOnce(of({ data: page([], '?page=2') }))
                .mockReturnValueOnce(of({ data: page([], '?page=2') }));

            await expect(
                gateway.getByVerb(XAPI_VERBS.COMPLETED),
            ).rejects.toThrow(BadGatewayException);
            expect(getMock).toHaveBeenCalledTimes(2);
        });

        it('propaga falha da segunda página preservando o erro', async () => {
            const error = new Error('Falha ao carregar a segunda página');
            getMock
                .mockReturnValueOnce(of({ data: page([], '?page=2') }))
                .mockReturnValueOnce(throwError(() => error));

            await expect(gateway.getByVerb(XAPI_VERBS.COMPLETED)).rejects.toBe(
                error,
            );
            expect(getMock).toHaveBeenCalledTimes(2);
        });
    });
});
