import { deterministicStatementId } from '../../../common/utils/deterministic-statement-id';
import {
    XAPI_ACTIVITY_TYPES,
    XAPI_EXTENSIONS,
    XAPI_VERBS,
} from '../../../xapi/domain/xapi.constants';
import type { TXApiStatement } from '../../domain/statements.entities';
import { GeneratePointsStatementUseCase } from '../generate-points-statement.use.case';

describe('GeneratePointsStatementUseCase', () => {
    const useCase = new GeneratePointsStatementUseCase();

    const original: TXApiStatement = {
        id: 'c3c2224e-ecc3-4498-993d-04a15ed510ac',
        actor: { name: 'Aluno Teste', mbox: 'mailto:aluno@email.com' },
        verb: { id: XAPI_VERBS.COMPLETED },
        object: {
            id: 'https://gamapi.dev/challenges/ux',
            definition: { type: XAPI_ACTIVITY_TYPES.CHALLENGE },
        },
    };

    it('gera o statement xAPI completo de recompensa', () => {
        const result = useCase.execute(original, 40);

        expect(result).toEqual({
            id: deterministicStatementId('earned-points', original.id),
            actor: original.actor,
            verb: {
                id: XAPI_VERBS.EARNED_POINTS,
                display: { 'en-US': 'earned points' },
            },
            object: {
                id: 'https://gamapi.dev/points',
                objectType: 'Activity',
                definition: {
                    type: XAPI_ACTIVITY_TYPES.POINTS,
                    name: { 'en-US': 'Points' },
                },
            },
            result: { extensions: { [XAPI_EXTENSIONS.POINTS]: 40 } },
            context: {
                statement: { objectType: 'StatementRef', id: original.id },
            },
        });
    });

    it('usa o mesmo identificador determinístico para o mesmo statement original', () => {
        expect(useCase.execute(original, 10).id).toBe(
            useCase.execute(original, 50).id,
        );
    });

    it('gera identificadores diferentes para conclusões diferentes', () => {
        const secondOriginal: TXApiStatement = {
            ...original,
            id: 'another-id',
        };

        expect(useCase.execute(original, 40).id).not.toBe(
            useCase.execute(secondOriginal, 40).id,
        );
    });

    it.each([0, 1, 100, 0.5, -1])('preserva o valor de pontos %p', (amount) => {
        const result = useCase.execute(original, amount);

        expect(result.result?.extensions?.[XAPI_EXTENSIONS.POINTS]).toBe(
            amount,
        );
    });

    it('mantém a referência e o ator da conclusão original', () => {
        const result = useCase.execute(original, 40);

        expect(result.actor).toBe(original.actor);
        expect(result.context?.statement?.id).toBe(original.id);
    });

    it('não altera o statement original', () => {
        const snapshot = structuredClone(original);

        useCase.execute(original, 40);

        expect(original).toEqual(snapshot);
    });
});
