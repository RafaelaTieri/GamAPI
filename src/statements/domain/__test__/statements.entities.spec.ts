import type {
    TXApiActivity,
    TXApiLanguageMap,
    TXApiStatement,
    TXApiStatementRef,
    TXApiStatementResult,
} from '../statements.entities';

describe('Statements entities', () => {
    it('deve representar um mapa de idiomas', () => {
        const names: TXApiLanguageMap = {
            'pt-BR': 'Desafio concluído',
            'en-US': 'Challenge completed',
        };

        expect(names['pt-BR']).toBe('Desafio concluído');
        expect(names['en-US']).toBe('Challenge completed');
    });

    it('deve representar uma atividade xAPI com campos opcionais', () => {
        const minimalActivity: TXApiActivity = {
            id: 'https://gamapi.dev/challenges/1',
        };

        const completeActivity: TXApiActivity = {
            id: minimalActivity.id,
            objectType: 'Activity',
            definition: {
                type: 'https://gamapi.dev/activity-types/challenge',
                name: { 'pt-BR': 'Desafio' },
                description: { 'pt-BR': 'Descrição do desafio' },
            },
        };

        expect(minimalActivity.definition).toBeUndefined();
        expect(completeActivity.definition?.name?.['pt-BR']).toBe('Desafio');
        expect(completeActivity.objectType).toBe('Activity');
    });

    it('deve representar uma referência de statement', () => {
        const reference: TXApiStatementRef = {
            objectType: 'StatementRef',
            id: 'original-1',
        };

        expect(reference).toEqual({
            objectType: 'StatementRef',
            id: 'original-1',
        });
    });

    it('deve representar um statement mínimo', () => {
        const statement: TXApiStatement = {
            id: 'statement-1',
            actor: { mbox: 'mailto:aluno@example.com' },
            verb: { id: 'https://adlnet.gov/expapi/verbs/completed' },
            object: { id: 'https://gamapi.dev/challenges/1' },
        };

        expect(statement.actor.name).toBeUndefined();
        expect(statement.context).toBeUndefined();
        expect(statement.result).toBeUndefined();
        expect(statement.timestamp).toBeUndefined();
    });

    it('deve representar um statement com todos os campos opcionais', () => {
        const statement: TXApiStatement = {
            id: 'statement-2',
            actor: {
                name: 'Aluno Teste',
                mbox: 'mailto:aluno@example.com',
            },
            verb: {
                id: 'https://adlnet.gov/expapi/verbs/completed',
                display: { 'pt-BR': 'concluiu' },
            },
            object: {
                id: 'https://gamapi.dev/challenges/2',
                objectType: 'Activity',
            },
            context: {
                statement: { objectType: 'StatementRef', id: 'original-1' },
                contextActivities: {
                    grouping: [{ id: 'https://gamapi.dev/projects/1' }],
                },
            },
            result: {
                extensions: {
                    'https://gamapi.dev/extensions/points': 10,
                    'https://gamapi.dev/extensions/label': 'teste',
                    'https://gamapi.dev/extensions/valid': true,
                },
            },
            timestamp: '2026-11-17T12:00:00Z',
        };

        expect(statement.result?.extensions).toEqual({
            'https://gamapi.dev/extensions/points': 10,
            'https://gamapi.dev/extensions/label': 'teste',
            'https://gamapi.dev/extensions/valid': true,
        });
        expect(statement.context?.statement?.id).toBe('original-1');
        expect(statement.timestamp).toBe('2026-11-17T12:00:00Z');
    });

    it('deve representar uma resposta paginada do LRS', () => {
        const statement: TXApiStatement = {
            id: 'statement-1',
            actor: { mbox: 'mailto:aluno@example.com' },
            verb: { id: 'completed' },
            object: { id: 'activity-1' },
        };

        const firstPage: TXApiStatementResult = {
            statements: [statement],
            more: '/xAPI/statements/?page=2',
        };
        const lastPage: TXApiStatementResult = {
            statements: [],
        };

        expect(firstPage.statements).toEqual([statement]);
        expect(firstPage.more).toBe('/xAPI/statements/?page=2');
        expect(lastPage.more).toBeUndefined();
    });
});
