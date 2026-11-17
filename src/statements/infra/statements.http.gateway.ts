import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import { XAPI_VERBS } from '../../xapi/domain/xapi.constants';

import type {
    TXApiStatement,
    TXApiStatementResult,
} from '../domain/statements.entities';
import { StatementGateway } from '../domain/statements.gateway';

type TLrsConfig = {
    url: string;
    username: string;
    password: string;
};

@Injectable()
export class StatementHttpGateway implements StatementGateway {
    constructor(private readonly httpService: HttpService) {}

    async create(statement: TXApiStatement): Promise<TXApiStatement> {
        const lrsConfig = this.getLrsConfig();

        await firstValueFrom(
            this.httpService.post(
                `${lrsConfig.url}/xAPI/statements/`,
                statement,
                this.getLrsRequestConfig(lrsConfig),
            ),
        );

        return statement;
    }

    async getById(statementId: string): Promise<TXApiStatement> {
        const lrsConfig = this.getLrsConfig();

        const lrsResponse = await firstValueFrom(
            this.httpService.get<TXApiStatement>(
                `${lrsConfig.url}/xAPI/statements/`,
                {
                    ...this.getLrsRequestConfig(lrsConfig),
                    params: {
                        statementId,
                    },
                },
            ),
        );

        return lrsResponse.data;
    }

    async getPointsByActor(
        participantMbox: string,
    ): Promise<TXApiStatementResult> {
        return this.getByActorAndVerb(
            participantMbox,
            XAPI_VERBS.EARNED_POINTS,
        );
    }

    async getAllStatementsByActor(
        participantMbox: string,
    ): Promise<TXApiStatementResult> {
        return this.getByActorAndVerb(participantMbox, XAPI_VERBS.COMPLETED);
    }

    private async getByActorAndVerb(
        participantMbox: string,
        statementVerb: string,
    ): Promise<TXApiStatementResult> {
        const lrsConfig = this.getLrsConfig();

        const lrsResponse = await firstValueFrom(
            this.httpService.get<TXApiStatementResult>(
                `${lrsConfig.url}/xAPI/statements/`,
                {
                    ...this.getLrsRequestConfig(lrsConfig),
                    params: {
                        agent: JSON.stringify({
                            mbox: participantMbox,
                        }),
                        verb: statementVerb,
                    },
                },
            ),
        );

        return this.collectStatementPages(lrsResponse.data, lrsConfig);
    }

    private async collectStatementPages(
        firstStatementPage: TXApiStatementResult,
        lrsConfig: TLrsConfig,
    ): Promise<TXApiStatementResult> {
        const collectedStatements = [...firstStatementPage.statements];

        let nextPagePath = firstStatementPage.more;

        while (nextPagePath) {
            const nextStatementPage = await this.fetchNextStatementPage(
                nextPagePath,
                lrsConfig,
            );

            collectedStatements.push(...nextStatementPage.statements);

            nextPagePath = nextStatementPage.more;
        }

        return {
            statements: collectedStatements,
        };
    }

    private async fetchNextStatementPage(
        nextPagePath: string,
        lrsConfig: TLrsConfig,
    ): Promise<TXApiStatementResult> {
        const nextPageUrl = new URL(
            nextPagePath,
            `${lrsConfig.url}/`,
        ).toString();

        const lrsResponse = await firstValueFrom(
            this.httpService.get<TXApiStatementResult>(
                nextPageUrl,
                this.getLrsRequestConfig(lrsConfig),
            ),
        );

        return lrsResponse.data;
    }

    private getLrsConfig(): TLrsConfig {
        const lrsUrl = process.env.LRS_URL;
        const lrsUsername = process.env.LRS_USERNAME;
        const lrsPassword = process.env.LRS_PASSWORD;

        if (!lrsUrl || !lrsUsername || !lrsPassword) {
            throw new Error(
                'Configurações de conexão com o LRS não informadas.',
            );
        }

        return {
            url: lrsUrl,
            username: lrsUsername,
            password: lrsPassword,
        };
    }

    private getLrsRequestConfig(lrsConfig: TLrsConfig) {
        return {
            auth: {
                username: lrsConfig.username,
                password: lrsConfig.password,
            },
            headers: {
                'Content-Type': 'application/json',
                'X-Experience-API-Version': '2.0.0',
            },
        };
    }
}
