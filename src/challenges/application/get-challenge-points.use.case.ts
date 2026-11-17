import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { XAPI_ACTIVITY_TYPES } from '../../xapi/domain/xapi.constants';
import type { TXApiStatement } from '../../statements/domain/statements.entities';

import { ChallengeGateway } from '../domain/challenge.gateway';

@Injectable()
export class GetChallengePointsUseCase {
    constructor(private readonly challengeGateway: ChallengeGateway) {}

    async execute(statement: TXApiStatement): Promise<number> {
        const applicationIri = this.getContextActivityIri(
            statement,
            XAPI_ACTIVITY_TYPES.EDUCATIONAL_APPLICATION,
        );

        const projectIri = this.getContextActivityIri(
            statement,
            XAPI_ACTIVITY_TYPES.PROJECT,
        );

        const challenge = await this.challengeGateway.getByContext({
            challengeIri: statement.object.id,
            applicationIri,
            projectIri,
        });

        if (!challenge) {
            throw new NotFoundException('Desafio não encontrado.');
        }

        return challenge.points;
    }

    private getContextActivityIri(
        statement: TXApiStatement,
        type: string,
    ): string {
        const activity = statement.context?.contextActivities?.grouping?.find(
            (item) => item.definition?.type === type,
        );

        if (!activity?.id) {
            throw new BadRequestException('Contexto do statement inválido.');
        }

        return activity.id;
    }
}
