import {
    BadGatewayException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import type {
    TXApiStatement,
    TXApiStatementResult,
} from '../../statements/domain/statements.entities';

import { BadgeStatementGateway } from '../domain/badge-statement.gateway';

@Injectable()
export class BadgeStatementHttpGateway implements BadgeStatementGateway {
    constructor(private readonly httpService: HttpService) {}

    async getByActorAndVerb(
        mbox: string,
        verb: string,
    ): Promise<TXApiStatement[]> {
        const endpoint = this.getEndpoint();
        const statements: TXApiStatement[] = [];
        const visited = new Set<string>();

        let nextUrl = endpoint;
        let params: { agent: string; verb: string } | undefined = {
            agent: JSON.stringify({ objectType: 'Agent', mbox }),
            verb,
        };

        while (nextUrl) {
            if (visited.has(nextUrl)) {
                throw new BadGatewayException('Paginação inválida do Ralph.');
            }

            visited.add(nextUrl);

            const page = await this.getPage(nextUrl, params);
            statements.push(...page.statements);

            nextUrl = page.more
                ? this.resolveNextPage(endpoint, page.more)
                : '';

            params = undefined;
        }

        return statements.filter((statement) => statement.actor.mbox === mbox);
    }

    async create(statement: TXApiStatement): Promise<void> {
        await firstValueFrom(
            this.httpService.post(
                this.getEndpoint(),
                statement,
                this.getRequestConfig(),
            ),
        );
    }

    private async getPage(
        url: string,
        params?: { agent: string; verb: string },
    ): Promise<TXApiStatementResult> {
        const response = await firstValueFrom(
            this.httpService.get<TXApiStatementResult>(url, {
                ...this.getRequestConfig(),
                params,
            }),
        );

        return response.data;
    }

    private getEndpoint(): string {
        const baseUrl = process.env.LRS_URL;

        if (!baseUrl) {
            throw new InternalServerErrorException('LRS_URL não configurada.');
        }

        return `${baseUrl.replace(/\/$/, '')}/xAPI/statements/`;
    }

    private getRequestConfig() {
        const username = process.env.LRS_USERNAME;
        const password = process.env.LRS_PASSWORD;

        if (!username || !password) {
            throw new InternalServerErrorException(
                'Credenciais do LRS não configuradas.',
            );
        }

        return {
            auth: { username, password },
            headers: {
                'X-Experience-API-Version': '2.0.0',
            },
        };
    }

    private resolveNextPage(endpoint: string, more: string): string {
        const next = new URL(more, endpoint);
        const base = new URL(endpoint);

        if (next.origin !== base.origin) {
            throw new BadGatewayException(
                'Paginação aponta para outro servidor.',
            );
        }

        return next.toString();
    }
}
