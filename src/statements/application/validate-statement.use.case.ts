import { BadRequestException, Injectable } from '@nestjs/common';

import {
    XAPI_ACTIVITY_TYPES,
    XAPI_VERBS,
} from '../../xapi/domain/xapi.constants';
import type { TXApiStatement } from '../domain/statements.entities';

@Injectable()
export class ValidateStatementUseCase {
    execute(incomingStatement: TXApiStatement): void {
        this.validateRequiredFields(incomingStatement);
        this.validateStatementId(incomingStatement.id);
        this.validateSupportedStatement(incomingStatement);
        this.validateContext(incomingStatement);
    }

    private validateRequiredFields(statement: TXApiStatement): void {
        if (!statement) {
            throw new BadRequestException('Informe o statement xAPI.');
        }

        if (!statement.id) {
            throw new BadRequestException(
                'Informe o identificador do statement.',
            );
        }

        if (!statement.actor?.mbox) {
            throw new BadRequestException('Informe o ator do statement.');
        }

        if (!statement.verb?.id) {
            throw new BadRequestException('Informe o verbo do statement.');
        }

        if (!statement.object?.id) {
            throw new BadRequestException('Informe o objeto do statement.');
        }
    }

    private validateStatementId(statementId: string): void {
        const statementUuidPattern =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (!statementUuidPattern.test(statementId)) {
            throw new BadRequestException(
                'O ID do statement não é um UUID válido.',
            );
        }
    }

    private validateSupportedStatement(statement: TXApiStatement): void {
        if (statement.verb.id !== XAPI_VERBS.COMPLETED) {
            throw new BadRequestException('O verbo informado não é suportado.');
        }

        if (
            statement.object.definition?.type !== XAPI_ACTIVITY_TYPES.CHALLENGE
        ) {
            throw new BadRequestException(
                'O tipo de atividade informado não é suportado.',
            );
        }
    }

    private validateContext(statement: TXApiStatement): void {
        const applicationActivity =
            statement.context?.contextActivities?.grouping?.find(
                (activity) =>
                    activity.definition?.type ===
                    XAPI_ACTIVITY_TYPES.EDUCATIONAL_APPLICATION,
            );

        if (!applicationActivity?.id) {
            throw new BadRequestException(
                'Informe a aplicação de origem do desafio.',
            );
        }
    }
}
