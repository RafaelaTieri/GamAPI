import { deterministicStatementId } from '../deterministic-statement-id';

const validateUuid = (value: string): boolean =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
    );

const uuidVersion = (value: string): number =>
    Number.parseInt(value.charAt(14), 16);

describe('deterministicStatementId', () => {
    describe('Formato do identificador', () => {
        it('deve gerar um UUID válido', () => {
            const result = deterministicStatementId(
                'earned-points',
                'statement-1',
            );

            expect(validateUuid(result)).toBe(true);
        });

        it('deve gerar um UUID versão 5', () => {
            const result = deterministicStatementId(
                'earned-points',
                'statement-1',
            );

            expect(uuidVersion(result)).toBe(5);
        });

        it('deve utilizar a variante RFC 4122', () => {
            const result = deterministicStatementId(
                'earned-badge',
                'project-1',
                'actor-1',
                'badge-1',
            );

            expect(result).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
            );
        });

        it('deve gerar identificadores com 36 caracteres', () => {
            const result = deterministicStatementId('test');

            expect(result).toHaveLength(36);
        });

        it('deve gerar identificadores em letras minúsculas', () => {
            const result = deterministicStatementId('TESTE');

            expect(result).toBe(result.toLowerCase());
        });
    });

    describe('Determinismo', () => {
        it('deve gerar o mesmo UUID para os mesmos parâmetros', () => {
            const firstId = deterministicStatementId(
                'earned-points',
                'statement-1',
            );

            const secondId = deterministicStatementId(
                'earned-points',
                'statement-1',
            );

            expect(firstId).toBe(secondId);
        });

        it('deve gerar UUIDs diferentes para parâmetros diferentes', () => {
            const firstId = deterministicStatementId(
                'earned-points',
                'statement-1',
            );

            const secondId = deterministicStatementId(
                'earned-points',
                'statement-2',
            );

            expect(firstId).not.toBe(secondId);
        });

        it('deve considerar a ordem dos parâmetros', () => {
            const firstId = deterministicStatementId('a', 'b');
            const secondId = deterministicStatementId('b', 'a');

            expect(firstId).not.toBe(secondId);
        });

        it('deve considerar a quantidade de parâmetros', () => {
            const firstId = deterministicStatementId('a');
            const secondId = deterministicStatementId('a', '');

            expect(firstId).not.toBe(secondId);
        });

        it('deve diferenciar valores vazios de parâmetros ausentes', () => {
            const firstId = deterministicStatementId();
            const secondId = deterministicStatementId('');

            expect(firstId).not.toBe(secondId);
        });

        it('deve diferenciar maiúsculas de minúsculas', () => {
            const firstId = deterministicStatementId('Badge');
            const secondId = deterministicStatementId('badge');

            expect(firstId).not.toBe(secondId);
        });

        it('deve diferenciar strings com espaços', () => {
            const firstId = deterministicStatementId('statement-1');
            const secondId = deterministicStatementId(' statement-1 ');

            expect(firstId).not.toBe(secondId);
        });

        it('deve diferenciar combinações de parâmetros', () => {
            const firstId = deterministicStatementId('ab', 'c');
            const secondId = deterministicStatementId('a', 'bc');

            expect(firstId).not.toBe(secondId);
        });
    });

    describe('Identificadores de recompensas', () => {
        it('deve gerar UUID determinístico para recompensa de pontos', () => {
            const result = deterministicStatementId(
                'earned-points',
                'statement-1',
            );

            expect(result).toBe('b390bc0b-b840-522c-94d6-b45dffed5e15');
        });

        it('deve gerar UUID determinístico para conquista de insígnia', () => {
            const result = deterministicStatementId(
                'earned-badge',
                'project-1',
                'mailto:aluna@example.com',
                'badge-1',
            );

            expect(result).toBe('36cc23f1-4ad0-5cbb-9778-9b5175e18f1d');
        });

        it('deve gerar identificadores diferentes para tipos de recompensa diferentes', () => {
            const pointsId = deterministicStatementId(
                'earned-points',
                'statement-1',
            );

            const badgeId = deterministicStatementId(
                'earned-badge',
                'statement-1',
            );

            expect(pointsId).not.toBe(badgeId);
        });

        it('deve gerar identificadores diferentes para participantes diferentes', () => {
            const firstId = deterministicStatementId(
                'earned-badge',
                'project-1',
                'mailto:aluno1@email.com',
                'badge-1',
            );

            const secondId = deterministicStatementId(
                'earned-badge',
                'project-1',
                'mailto:aluno2@email.com',
                'badge-1',
            );

            expect(firstId).not.toBe(secondId);
        });

        it('deve gerar identificadores diferentes para projetos diferentes', () => {
            const firstId = deterministicStatementId(
                'earned-badge',
                'project-1',
                'mailto:aluno@email.com',
                'badge-1',
            );

            const secondId = deterministicStatementId(
                'earned-badge',
                'project-2',
                'mailto:aluno@email.com',
                'badge-1',
            );

            expect(firstId).not.toBe(secondId);
        });

        it('deve gerar identificadores diferentes para insígnias diferentes', () => {
            const firstId = deterministicStatementId(
                'earned-badge',
                'project-1',
                'mailto:aluno@email.com',
                'badge-1',
            );

            const secondId = deterministicStatementId(
                'earned-badge',
                'project-1',
                'mailto:aluno@email.com',
                'badge-2',
            );

            expect(firstId).not.toBe(secondId);
        });
    });

    describe('Casos especiais', () => {
        it('deve gerar UUID válido sem parâmetros', () => {
            const result = deterministicStatementId();

            expect(result).toBe('58535468-26d6-5028-a6c2-0a39929aae5b');
        });

        it('deve aceitar caracteres Unicode', () => {
            const result = deterministicStatementId('ação', '❤️');

            expect(result).toBe('042f0df7-e293-578b-a837-03193171d5e0');
        });

        it('deve aceitar parâmetros com caracteres especiais', () => {
            const result = deterministicStatementId(
                'https://gamapi.dev/challenges/ux?level=1',
                'mailto:aluno+teste@email.com',
            );

            expect(validateUuid(result)).toBe(true);
            expect(uuidVersion(result)).toBe(5);
        });

        it('deve gerar UUID válido para strings longas', () => {
            const result = deterministicStatementId('a'.repeat(10000));

            expect(validateUuid(result)).toBe(true);
            expect(uuidVersion(result)).toBe(5);
        });

        it('deve manter o resultado consistente em chamadas repetidas', () => {
            const results = Array.from({ length: 100 }, () =>
                deterministicStatementId('earned-points', 'statement-1'),
            );

            expect(new Set(results).size).toBe(1);
        });
    });
});
