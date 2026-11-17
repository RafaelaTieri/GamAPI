import { HttpService } from '@nestjs/axios';
import {
    BadGatewayException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import type {
    TXApiStatement,
    TXApiStatementResult,
} from '../../statements/domain/statements.entities';
import { LeaderboardGateway } from '../domain/leaderboard.gateway';

@Injectable()
export class LeaderboardHttpGateway implements LeaderboardGateway {
    constructor(private readonly httpService: HttpService) {}

    async getByVerb(statementVerb: string): Promise<TXApiStatement[]> {
        const statementsEndpoint = this.getStatementsEndpoint();
        const collectedStatements: TXApiStatement[] = [];
        const visitedPageUrls = new Set<string>();

        let nextPageUrl = statementsEndpoint;
        let queryParams: { verb: string } | undefined = {
            verb: statementVerb,
        };

        while (nextPageUrl) {
            if (visitedPageUrls.has(nextPageUrl)) {
                throw new BadGatewayException('Paginação inválida do Ralph.');
            }

            visitedPageUrls.add(nextPageUrl);

            const statementPage = await this.fetchStatementPage(
                nextPageUrl,
                queryParams,
            );

            collectedStatements.push(...statementPage.statements);

            nextPageUrl = statementPage.more
                ? this.resolveNextPageUrl(
                      statementsEndpoint,
                      statementPage.more,
                  )
                : '';

            queryParams = undefined;
        }

        return collectedStatements;
    }

    private getStatementsEndpoint(): string {
        const lrsBaseUrl = process.env.LRS_URL;

        if (!lrsBaseUrl) {
            throw new InternalServerErrorException('LRS_URL não configurada.');
        }

        return `${lrsBaseUrl.replace(/\/$/, '')}/xAPI/statements/`;
    }

    private async fetchStatementPage(
        pageUrl: string,
        queryParams?: { verb: string },
    ): Promise<TXApiStatementResult> {
        const lrsUsername = process.env.LRS_USERNAME;
        const lrsPassword = process.env.LRS_PASSWORD;

        if (!lrsUsername || !lrsPassword) {
            throw new InternalServerErrorException(
                'Credenciais do LRS não configuradas.',
            );
        }

        const lrsResponse = await firstValueFrom(
            this.httpService.get<TXApiStatementResult>(pageUrl, {
                params: queryParams,
                auth: {
                    username: lrsUsername,
                    password: lrsPassword,
                },
                headers: {
                    'X-Experience-API-Version': '2.0.0',
                },
            }),
        );

        return lrsResponse.data;
    }

    private resolveNextPageUrl(
        statementsEndpoint: string,
        nextPagePath: string,
    ): string {
        const nextPageUrl = new URL(nextPagePath, statementsEndpoint);

        const lrsEndpointUrl = new URL(statementsEndpoint);

        if (nextPageUrl.origin !== lrsEndpointUrl.origin) {
            throw new BadGatewayException(
                'Paginação aponta para um servidor diferente.',
            );
        }

        return nextPageUrl.toString();
    }
}
