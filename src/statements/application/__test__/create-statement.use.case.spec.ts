import { ConflictException } from '@nestjs/common';

import type { ProcessEarnedBadgesUseCase } from '../../../badges/application/process-earned-badges.use.case';
import type { GetChallengePointsUseCase } from '../../../challenges/application/get-challenge-points.use.case';
import type { IdempotentStatementUseCase } from '../../../idempotency/application/idempotent-statement.use.case';
import {
    XAPI_ACTIVITY_TYPES,
    XAPI_VERBS,
} from '../../../xapi/domain/xapi.constants';
import type { TXApiStatement } from '../../domain/statements.entities';
import { CreateStatementUseCase } from '../create-statement.use.case';
import type { ValidateStatementUseCase } from '../validate-statement.use.case';

describe('CreateStatementUseCase', () => {
    const original: TXApiStatement = {
        id: 'a3230bc1-764d-4ccb-97b2-555e1ab98132',
        actor: { mbox: 'mailto:aluno@email.com', name: 'Aluno' },
        verb: { id: XAPI_VERBS.COMPLETED },
        object: {
            id: 'https://gamapi.dev/challenges/ux',
            definition: { type: XAPI_ACTIVITY_TYPES.CHALLENGE },
        },
    };

    const points: TXApiStatement = {
        id: 'points-statement-1',
        actor: original.actor,
        verb: { id: XAPI_VERBS.EARNED_POINTS },
        object: { id: 'https://gamapi.dev/points' },
        context: {
            statement: { objectType: 'StatementRef', id: original.id },
        },
    };

    let useCase: CreateStatementUseCase;
    let validate: jest.Mock<void, [TXApiStatement]>;
    let getPoints: jest.Mock<Promise<number>, [TXApiStatement]>;
    let generate: jest.Mock<TXApiStatement, [TXApiStatement, number]>;
    let processBadges: jest.Mock<
        Promise<TXApiStatement[]>,
        [TXApiStatement, TXApiStatement]
    >;
    let findById: jest.Mock<Promise<TXApiStatement | null>, [string]>;
    let assertOriginalMatches: jest.Mock<
        void,
        [TXApiStatement, TXApiStatement]
    >;
    let findExistingPoints: jest.Mock<
        Promise<TXApiStatement | null>,
        [string, string]
    >;
    let ensureOriginal: jest.Mock<
        Promise<{ statement: TXApiStatement; created: boolean }>,
        [TXApiStatement]
    >;
    let ensurePoints: jest.Mock<
        Promise<{ statement: TXApiStatement; created: boolean }>,
        [TXApiStatement]
    >;

    beforeEach(() => {
        validate = jest.fn<void, [TXApiStatement]>();
        getPoints = jest
            .fn<Promise<number>, [TXApiStatement]>()
            .mockResolvedValue(40);
        generate = jest
            .fn<TXApiStatement, [TXApiStatement, number]>()
            .mockReturnValue(points);
        processBadges = jest
            .fn<Promise<TXApiStatement[]>, [TXApiStatement, TXApiStatement]>()
            .mockResolvedValue([]);
        findById = jest
            .fn<Promise<TXApiStatement | null>, [string]>()
            .mockResolvedValue(null);
        assertOriginalMatches = jest.fn<
            void,
            [TXApiStatement, TXApiStatement]
        >();
        findExistingPoints = jest
            .fn<Promise<TXApiStatement | null>, [string, string]>()
            .mockResolvedValue(null);
        ensureOriginal = jest
            .fn<
                Promise<{ statement: TXApiStatement; created: boolean }>,
                [TXApiStatement]
            >()
            .mockResolvedValue({ statement: original, created: true });
        ensurePoints = jest
            .fn<
                Promise<{ statement: TXApiStatement; created: boolean }>,
                [TXApiStatement]
            >()
            .mockResolvedValue({ statement: points, created: true });

        useCase = new CreateStatementUseCase(
            { execute: validate } as unknown as ValidateStatementUseCase,
            { execute: getPoints } as unknown as GetChallengePointsUseCase,
            { execute: generate },
            { execute: processBadges } as unknown as ProcessEarnedBadgesUseCase,
            {
                findById,
                assertOriginalMatches,
                findExistingPoints,
                ensureOriginal,
                ensurePoints,
            } as unknown as IdempotentStatementUseCase,
        );
    });

    it('valida e registra o statement original e a recompensa de pontos', async () => {
        const result = await useCase.execute(original);

        expect(validate).toHaveBeenCalledWith(original);
        expect(findById).toHaveBeenCalledWith(original.id);
        expect(findExistingPoints).toHaveBeenCalledWith(
            original.actor.mbox,
            original.id,
        );
        expect(getPoints).toHaveBeenCalledWith(original);
        expect(ensureOriginal).toHaveBeenCalledWith(original);
        expect(generate).toHaveBeenCalledWith(original, 40);
        expect(ensurePoints).toHaveBeenCalledWith(points);
        expect(processBadges).toHaveBeenCalledWith(original, points);
        expect(assertOriginalMatches).not.toHaveBeenCalled();
        expect(result).toBe(points);
    });

    it('verifica a igualdade quando o original já está salvo', async () => {
        const storedOriginal: TXApiStatement = { ...original };
        findById.mockResolvedValue(storedOriginal);

        await useCase.execute(original);

        expect(assertOriginalMatches).toHaveBeenCalledTimes(1);
        expect(assertOriginalMatches).toHaveBeenCalledWith(
            storedOriginal,
            original,
        );
        expect(ensureOriginal).toHaveBeenCalledWith(original);
    });

    it('reutiliza uma recompensa anterior sem recalcular ou gerar pontos', async () => {
        const previousReward: TXApiStatement = {
            ...points,
            id: 'existing-points',
        };
        findExistingPoints.mockResolvedValue(previousReward);

        const result = await useCase.execute(original);

        expect(getPoints).not.toHaveBeenCalled();
        expect(generate).not.toHaveBeenCalled();
        expect(ensurePoints).not.toHaveBeenCalled();
        expect(ensureOriginal).toHaveBeenCalledWith(original);
        expect(processBadges).toHaveBeenCalledWith(original, previousReward);
        expect(result).toBe(previousReward);
    });

    it('verifica o original e reaproveita a recompensa quando ambos já existem', async () => {
        findById.mockResolvedValue(original);
        findExistingPoints.mockResolvedValue(points);

        await expect(useCase.execute(original)).resolves.toBe(points);

        expect(assertOriginalMatches).toHaveBeenCalledWith(original, original);
        expect(getPoints).not.toHaveBeenCalled();
        expect(ensurePoints).not.toHaveBeenCalled();
    });

    it('retorna o statement salvo quando a recompensa foi criada por outra requisição', async () => {
        const storedPoints: TXApiStatement = { ...points, id: 'stored-points' };
        ensurePoints.mockResolvedValue({
            statement: storedPoints,
            created: false,
        });

        const result = await useCase.execute(original);

        expect(result).toBe(storedPoints);
        expect(processBadges).toHaveBeenCalledWith(original, storedPoints);
    });

    it('aceita desafios com zero pontos', async () => {
        getPoints.mockResolvedValue(0);

        await useCase.execute(original);

        expect(generate).toHaveBeenCalledWith(original, 0);
    });

    it('executa as etapas na ordem necessária', async () => {
        await useCase.execute(original);

        const sequence = [
            validate.mock.invocationCallOrder[0],
            findById.mock.invocationCallOrder[0],
            findExistingPoints.mock.invocationCallOrder[0],
            getPoints.mock.invocationCallOrder[0],
            ensureOriginal.mock.invocationCallOrder[0],
            generate.mock.invocationCallOrder[0],
            ensurePoints.mock.invocationCallOrder[0],
            processBadges.mock.invocationCallOrder[0],
        ];

        expect(sequence).toEqual(
            [...sequence].sort((first, second) => first - second),
        );
    });

    it('interrompe a operação se a validação falhar', async () => {
        const error = new Error('Statement inválido.');
        validate.mockImplementation(() => {
            throw error;
        });

        await expect(useCase.execute(original)).rejects.toBe(error);
        expect(findById).not.toHaveBeenCalled();
        expect(ensureOriginal).not.toHaveBeenCalled();
    });

    it('propaga falha na busca do statement original', async () => {
        const error = new Error('Falha na consulta do original.');
        findById.mockRejectedValue(error);

        await expect(useCase.execute(original)).rejects.toBe(error);
        expect(findExistingPoints).not.toHaveBeenCalled();
    });

    it('interrompe a operação quando um original existente é incompatível', async () => {
        const error = new ConflictException('Conteúdo incompatível.');
        findById.mockResolvedValue(original);
        assertOriginalMatches.mockImplementation(() => {
            throw error;
        });

        await expect(useCase.execute(original)).rejects.toBe(error);
        expect(findExistingPoints).not.toHaveBeenCalled();
        expect(ensureOriginal).not.toHaveBeenCalled();
    });

    it('propaga falha ao procurar recompensa anterior', async () => {
        const error = new Error('Falha ao consultar recompensa.');
        findExistingPoints.mockRejectedValue(error);

        await expect(useCase.execute(original)).rejects.toBe(error);
        expect(getPoints).not.toHaveBeenCalled();
        expect(ensureOriginal).not.toHaveBeenCalled();
    });

    it('não registra o original quando a consulta da pontuação falha', async () => {
        const error = new Error('Desafio não encontrado.');
        getPoints.mockRejectedValue(error);

        await expect(useCase.execute(original)).rejects.toBe(error);
        expect(ensureOriginal).not.toHaveBeenCalled();
        expect(generate).not.toHaveBeenCalled();
    });

    it('não gera pontos quando o registro do original falha', async () => {
        const error = new Error('Falha ao registrar original.');
        ensureOriginal.mockRejectedValue(error);

        await expect(useCase.execute(original)).rejects.toBe(error);
        expect(generate).not.toHaveBeenCalled();
        expect(ensurePoints).not.toHaveBeenCalled();
        expect(processBadges).not.toHaveBeenCalled();
    });

    it('propaga falha na geração do statement de pontos', async () => {
        const error = new Error('Falha ao gerar recompensa.');
        generate.mockImplementation(() => {
            throw error;
        });

        await expect(useCase.execute(original)).rejects.toBe(error);
        expect(ensurePoints).not.toHaveBeenCalled();
        expect(processBadges).not.toHaveBeenCalled();
    });

    it('não processa insígnias quando o registro de pontos falha', async () => {
        const error = new Error('Falha ao registrar pontos.');
        ensurePoints.mockRejectedValue(error);

        await expect(useCase.execute(original)).rejects.toBe(error);
        expect(processBadges).not.toHaveBeenCalled();
    });

    it('propaga falha ao processar insígnias', async () => {
        const error = new Error('Falha ao processar insígnias.');
        processBadges.mockRejectedValue(error);

        await expect(useCase.execute(original)).rejects.toBe(error);
        expect(ensurePoints).toHaveBeenCalledTimes(1);
    });
});
