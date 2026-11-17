import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Injectable } from '@nestjs/common';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

import type {
    TXApiStatement,
    TXApiStatementResult,
} from '../../statements/domain/statements.entities';
import { StatementIdempotencyGateway } from '../domain/statement-idempotency.gateway';

@Injectable()
export class StatementIdempotencyHttpGateway implements StatementIdempotencyGateway {
    private readonly baseUrl = process.env.LRS_URL?.replace(/\/$/, '') ?? '';

    constructor(private readonly httpService: HttpService) {}

    async getById(statementId: string): Promise<TXApiStatement | null> {
        try {
            const response = await firstValueFrom(
                this.httpService.get<unknown>(this.statementsUrl, {
                    ...this.options,
                    params: { statementId },
                }),
            );

            const data = response.data;

            if (!this.isRecord(data)) {
                throw new BadGatewayException(
                    'O Ralph retornou uma resposta inválida.',
                );
            }

            if (data.statements !== undefined) {
                if (!Array.isArray(data.statements)) {
                    throw new BadGatewayException(
                        'O Ralph retornou uma lista inválida.',
                    );
                }

                const statementList: unknown[] = data.statements;

                const matchingStatement = statementList.find(
                    (statement) =>
                        this.isRecord(statement) &&
                        statement.id === statementId,
                );

                if (!matchingStatement) {
                    return null;
                }

                if (!this.isXApiStatement(matchingStatement)) {
                    throw new BadGatewayException(
                        'O Ralph retornou um statement xAPI inválido.',
                    );
                }

                return matchingStatement;
            }

            if (data.id === statementId && this.isXApiStatement(data)) {
                return data;
            }

            throw new BadGatewayException(
                'O Ralph retornou um statement xAPI inesperado.',
            );
        } catch (error) {
            if (isAxiosError(error) && error.response?.status === 404) {
                return null;
            }

            throw error;
        }
    }

    async getByActorAndVerb(
        mbox: string,
        verb: string,
    ): Promise<TXApiStatement[]> {
        const result: TXApiStatement[] = [];
        const visited = new Set<string>();
        let nextUrl: string | null = this.statementsUrl;
        let firstPage = true;

        while (nextUrl) {
            if (visited.has(nextUrl)) {
                throw new Error('Paginação circular retornada pelo Ralph.');
            }

            visited.add(nextUrl);

            const response: { data: TXApiStatementResult } =
                await firstValueFrom(
                    this.httpService.get<TXApiStatementResult>(nextUrl, {
                        ...this.options,
                        params: firstPage
                            ? {
                                  agent: JSON.stringify({
                                      objectType: 'Agent',
                                      mbox,
                                  }),
                                  verb,
                              }
                            : undefined,
                    }),
                );

            result.push(...response.data.statements);

            const more = response.data.more;

            nextUrl = more ? this.getNextPageUrl(more) : null;

            firstPage = false;
        }

        return result;
    }

    async create(statement: TXApiStatement): Promise<void> {
        await firstValueFrom(
            this.httpService.post(this.statementsUrl, statement, this.options),
        );
    }

    private isRecord(value: unknown): value is Record<string, unknown> {
        return (
            typeof value === 'object' && value !== null && !Array.isArray(value)
        );
    }

    private isXApiStatement(value: unknown): value is TXApiStatement {
        if (!this.isRecord(value)) {
            return false;
        }

        const actor = value.actor;
        const verb = value.verb;
        const statementObject = value.object;

        return (
            typeof value.id === 'string' &&
            this.isRecord(actor) &&
            typeof actor.mbox === 'string' &&
            this.isRecord(verb) &&
            typeof verb.id === 'string' &&
            this.isRecord(statementObject) &&
            typeof statementObject.id === 'string'
        );
    }

    private getNextPageUrl(more: string): string {
        const next = new URL(more, this.baseUrl + '/');
        const origin = new URL(this.baseUrl).origin;

        if (next.origin !== origin) {
            throw new Error('Ralph retornou uma URL de paginação externa.');
        }

        return next.toString();
    }

    private get statementsUrl(): string {
        return `${this.baseUrl}/xAPI/statements/`;
    }

    private get options() {
        return {
            auth: {
                username: process.env.LRS_USERNAME ?? '',
                password: process.env.LRS_PASSWORD ?? '',
            },
            headers: {
                'X-Experience-API-Version': '2.0.0',
            },
            timeout: 10000,
        };
    }
}
