import type { TChallenge, TCreateChallenge } from '../challenge.entities';

describe('Challenge Entities', () => {
    const createChallenge = (
        overrides: Partial<TChallenge> = {},
    ): TChallenge => ({
        id: 'challenge-1',
        name: 'Testes de UX',
        iri: 'https://gamapi.dev/challenges/testes-de-ux',
        points: 40,
        active: true,
        ...overrides,
    });

    it('deve representar um desafio ativo', () => {
        const challenge: TChallenge = createChallenge();

        expect(challenge).toEqual({
            id: 'challenge-1',
            name: 'Testes de UX',
            iri: 'https://gamapi.dev/challenges/testes-de-ux',
            points: 40,
            active: true,
        });
    });

    it('deve representar um desafio inativo', () => {
        const challenge = createChallenge({
            active: false,
        });

        expect(challenge.active).toBe(false);
    });

    it('deve permitir um desafio com zero pontos', () => {
        const challenge = createChallenge({
            points: 0,
        });

        expect(challenge.points).toBe(0);
    });

    it('deve representar os dados de criação de um desafio', () => {
        const input: TCreateChallenge = {
            name: 'Testes de UX',
            iri: 'https://gamapi.dev/challenges/testes-de-ux',
            points: 40,
        };

        expect(input).toEqual({
            name: 'Testes de UX',
            iri: 'https://gamapi.dev/challenges/testes-de-ux',
            points: 40,
        });
    });

    it('deve permitir criar dados com pontuação zero', () => {
        const input: TCreateChallenge = {
            name: 'Desafio introdutório',
            iri: 'https://gamapi.dev/challenges/introducao',
            points: 0,
        };

        expect(input.points).toBe(0);
    });

    it('deve permitir diferentes identificadores e IRIs', () => {
        const firstChallenge = createChallenge();

        const secondChallenge = createChallenge({
            id: 'challenge-2',
            iri: 'https://gamapi.dev/challenges/avancado',
        });

        expect(firstChallenge.id).not.toBe(secondChallenge.id);
        expect(firstChallenge.iri).not.toBe(secondChallenge.iri);
    });

    it('deve preservar o nome e a pontuação do desafio', () => {
        const challenge = createChallenge({
            name: 'Desafio avançado',
            points: 150,
        });

        expect(challenge.name).toBe('Desafio avançado');
        expect(challenge.points).toBe(150);
    });
});
