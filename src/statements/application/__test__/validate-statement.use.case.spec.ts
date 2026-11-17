import { BadRequestException } from '@nestjs/common';

import {
    XAPI_ACTIVITY_TYPES,
    XAPI_VERBS,
} from '../../../xapi/domain/xapi.constants';
import type { TXApiStatement } from '../../domain/statements.entities';
import { ValidateStatementUseCase } from '../validate-statement.use.case';

describe('ValidateStatementUseCase', () => {
    const validStatement: TXApiStatement = {
        id: 'eb67d38f-144d-4cf1-bf7f-b8352f98593a',
        actor: { name: 'Aluno', mbox: 'mailto:aluno@email.com' },
        verb: { id: XAPI_VERBS.COMPLETED },
        object: {
            id: 'https://gamapi.dev/challenges/ux',
            objectType: 'Activity',
            definition: { type: XAPI_ACTIVITY_TYPES.CHALLENGE },
        },
        context: {
            contextActivities: {
                grouping: [
                    {
                        id: 'https://gamapi.dev/projects/ux',
                        definition: { type: XAPI_ACTIVITY_TYPES.PROJECT },
                    },
                    {
                        id: 'https://gamapi.dev/applications/teste',
                        definition: {
                            type: XAPI_ACTIVITY_TYPES.EDUCATIONAL_APPLICATION,
                        },
                    },
                ],
            },
        },
    };

    const createStatement = (
        overrides: Partial<TXApiStatement> = {},
    ): TXApiStatement => ({ ...validStatement, ...overrides });

    const useCase = new ValidateStatementUseCase();

    it('aceita um statement xAPI válido', () => {
        expect(() => useCase.execute(validStatement)).not.toThrow();
    });

    it('retorna undefined ao validar com sucesso', () => {
        expect(useCase.execute(validStatement)).toBeUndefined();
    });

    it('aceita UUID com letras maiúsculas', () => {
        const statement = createStatement({
            id: 'EB67D38F-144D-4CF1-BF7F-B8352F98593A',
        });

        expect(() => useCase.execute(statement)).not.toThrow();
    });

    it('rejeita um statement ausente', () => {
        expect(() =>
            useCase.execute(undefined as unknown as TXApiStatement),
        ).toThrow('Informe o statement xAPI.');
    });

    it('rejeita um statement null', () => {
        expect(() =>
            useCase.execute(null as unknown as TXApiStatement),
        ).toThrow(BadRequestException);
    });

    it.each(['', undefined, null])('rejeita ID ausente: %p', (id) => {
        const statement = createStatement({ id: id as string });

        expect(() => useCase.execute(statement)).toThrow(
            'Informe o identificador do statement.',
        );
    });

    it.each([
        'abc',
        '123',
        'eb67d38f144d4cf1bf7fb8352f98593a',
        'eb67d38f-144d-4cf1-bf7f-b8352f98593z',
        'eb67d38f-144d-4cf1-bf7f-b8352f98593a-extra',
    ])('rejeita um UUID malformado: %s', (id) => {
        expect(() => useCase.execute(createStatement({ id }))).toThrow(
            'O ID do statement não é um UUID válido.',
        );
    });

    it('rejeita ator sem e-mail', () => {
        expect(() =>
            useCase.execute(createStatement({ actor: { mbox: '' } })),
        ).toThrow('Informe o ator do statement.');
    });

    it('rejeita ator ausente', () => {
        const statement = createStatement({ actor: undefined });

        expect(() => useCase.execute(statement)).toThrow(
            'Informe o ator do statement.',
        );
    });

    it('rejeita verbo sem ID', () => {
        expect(() =>
            useCase.execute(createStatement({ verb: { id: '' } })),
        ).toThrow('Informe o verbo do statement.');
    });

    it('rejeita verbo ausente', () => {
        const statement = createStatement({ verb: undefined });

        expect(() => useCase.execute(statement)).toThrow(
            'Informe o verbo do statement.',
        );
    });

    it('rejeita objeto sem ID', () => {
        expect(() =>
            useCase.execute(createStatement({ object: { id: '' } })),
        ).toThrow('Informe o objeto do statement.');
    });

    it('rejeita objeto ausente', () => {
        const statement = createStatement({ object: undefined });

        expect(() => useCase.execute(statement)).toThrow(
            'Informe o objeto do statement.',
        );
    });

    it('valida campos obrigatórios antes de verificar o formato do UUID', () => {
        const statement = createStatement({
            id: 'inválido',
            actor: { mbox: '' },
        });

        expect(() => useCase.execute(statement)).toThrow(
            'Informe o ator do statement.',
        );
    });

    it('rejeita verbos diferentes de completed', () => {
        const statement = createStatement({
            verb: { id: XAPI_VERBS.EARNED_POINTS },
        });

        expect(() => useCase.execute(statement)).toThrow(
            'O verbo informado não é suportado.',
        );
    });

    it('rejeita atividade que não é um desafio', () => {
        const statement = createStatement({
            object: {
                id: validStatement.object.id,
                definition: { type: XAPI_ACTIVITY_TYPES.PROJECT },
            },
        });

        expect(() => useCase.execute(statement)).toThrow(
            'O tipo de atividade informado não é suportado.',
        );
    });

    it('rejeita objeto sem definição da atividade', () => {
        const statement = createStatement({
            object: { id: validStatement.object.id },
        });

        expect(() => useCase.execute(statement)).toThrow(
            'O tipo de atividade informado não é suportado.',
        );
    });

    it('rejeita definição sem tipo de atividade', () => {
        const statement = createStatement({
            object: { id: validStatement.object.id, definition: {} },
        });

        expect(() => useCase.execute(statement)).toThrow(BadRequestException);
    });

    it.each([
        [undefined],
        [{}],
        [{ contextActivities: {} }],
        [{ contextActivities: { grouping: [] } }],
    ])('rejeita contexto inválido: %p', (context) => {
        expect(() => useCase.execute(createStatement({ context }))).toThrow(
            'Informe a aplicação de origem do desafio.',
        );
    });

    it('rejeita grouping sem atividade de aplicação', () => {
        const statement = createStatement({
            context: {
                contextActivities: {
                    grouping: [
                        {
                            id: 'https://gamapi.dev/projects/ux',
                            definition: { type: XAPI_ACTIVITY_TYPES.PROJECT },
                        },
                    ],
                },
            },
        });

        expect(() => useCase.execute(statement)).toThrow(
            'Informe a aplicação de origem do desafio.',
        );
    });

    it('rejeita atividade sem definição de tipo', () => {
        const statement = createStatement({
            context: {
                contextActivities: {
                    grouping: [{ id: 'https://gamapi.dev/applications/teste' }],
                },
            },
        });

        expect(() => useCase.execute(statement)).toThrow(BadRequestException);
    });

    it('rejeita aplicação com identificador vazio', () => {
        const statement = createStatement({
            context: {
                contextActivities: {
                    grouping: [
                        {
                            id: '',
                            definition: {
                                type: XAPI_ACTIVITY_TYPES.EDUCATIONAL_APPLICATION,
                            },
                        },
                    ],
                },
            },
        });

        expect(() => useCase.execute(statement)).toThrow(
            'Informe a aplicação de origem do desafio.',
        );
    });

    it('aceita a aplicação em qualquer posição do agrupamento', () => {
        const statement = createStatement({
            context: {
                contextActivities: {
                    grouping: [
                        { id: 'sem-definicao' },
                        {
                            id: 'https://gamapi.dev/applications/teste',
                            definition: {
                                type: XAPI_ACTIVITY_TYPES.EDUCATIONAL_APPLICATION,
                            },
                        },
                    ],
                },
            },
        });

        expect(() => useCase.execute(statement)).not.toThrow();
    });
});
