import type { PrismaService } from '../../../database/prisma.service';
import type { TChallenge } from '../../domain/challenge.entities';
import type { TGetChallengeByContext } from '../../domain/challenge.gateway';
import { ChallengePrismaGateway } from '../challenge.prisma.gateway';

jest.mock('../../../database/prisma.service', () => ({
    PrismaService: class PrismaService {},
}));

describe('ChallengePrismaGateway', () => {
    let gateway: ChallengePrismaGateway;
    let prisma: {
        challenge: {
            findFirst: jest.Mock;
        };
    };

    const CHALLENGE_IRI = 'https://gamapi.dev/challenges/ux';
    const PROJECT_IRI = 'https://gamapi.dev/projects/ux';
    const APPLICATION_IRI = 'https://gamapi.dev/applications/teste';

    const validContext: TGetChallengeByContext = {
        challengeIri: CHALLENGE_IRI,
        projectIri: PROJECT_IRI,
        applicationIri: APPLICATION_IRI,
    };

    const challenge: TChallenge = {
        id: 'challenge-1',
        name: 'Desafio de UX',
        iri: CHALLENGE_IRI,
        points: 40,
        active: true,
    };

    const expectedQuery = (params: TGetChallengeByContext) => ({
        where: {
            iri: params.challengeIri,
            active: true,
            projects: {
                some: {
                    project: {
                        iri: params.projectIri,
                        active: true,
                        application: {
                            iri: params.applicationIri,
                            active: true,
                        },
                    },
                },
            },
        },
        select: {
            id: true,
            name: true,
            iri: true,
            points: true,
            active: true,
        },
    });

    beforeEach(() => {
        prisma = {
            challenge: {
                findFirst: jest.fn().mockResolvedValue(challenge),
            },
        };

        gateway = new ChallengePrismaGateway(
            prisma as unknown as PrismaService,
        );
    });

    describe('Consulta por contexto', () => {
        it('deve consultar o desafio com todos os filtros corretos', async () => {
            const result = await gateway.getByContext(validContext);

            expect(result).toEqual(challenge);

            expect(prisma.challenge.findFirst).toHaveBeenCalledTimes(1);

            expect(prisma.challenge.findFirst).toHaveBeenCalledWith({
                where: {
                    iri: CHALLENGE_IRI,
                    active: true,
                    projects: {
                        some: {
                            project: {
                                iri: PROJECT_IRI,
                                active: true,
                                application: {
                                    iri: APPLICATION_IRI,
                                    active: true,
                                },
                            },
                        },
                    },
                },
                select: {
                    id: true,
                    name: true,
                    iri: true,
                    points: true,
                    active: true,
                },
            });
        });

        it('deve retornar null quando nenhum desafio for encontrado', async () => {
            prisma.challenge.findFirst.mockResolvedValue(null);

            const result = await gateway.getByContext(validContext);

            expect(result).toBeNull();
            expect(prisma.challenge.findFirst).toHaveBeenCalledTimes(1);
        });

        it('deve utilizar a IRI do desafio recebida nos parâmetros', async () => {
            const anotherChallengeIri =
                'https://gamapi.dev/challenges/avancado';

            await gateway.getByContext({
                ...validContext,
                challengeIri: anotherChallengeIri,
            });

            expect(prisma.challenge.findFirst).toHaveBeenCalledWith(
                expectedQuery({
                    ...validContext,
                    challengeIri: anotherChallengeIri,
                }),
            );
        });

        it('deve utilizar a IRI do projeto recebida nos parâmetros', async () => {
            const anotherProjectIri = 'https://gamapi.dev/projects/avancado';

            await gateway.getByContext({
                ...validContext,
                projectIri: anotherProjectIri,
            });

            expect(prisma.challenge.findFirst).toHaveBeenCalledWith(
                expectedQuery({
                    ...validContext,
                    projectIri: anotherProjectIri,
                }),
            );
        });

        it('deve utilizar a IRI da aplicação recebida nos parâmetros', async () => {
            const anotherApplicationIri =
                'https://gamapi.dev/applications/outra';

            await gateway.getByContext({
                ...validContext,
                applicationIri: anotherApplicationIri,
            });

            expect(prisma.challenge.findFirst).toHaveBeenCalledWith(
                expectedQuery({
                    ...validContext,
                    applicationIri: anotherApplicationIri,
                }),
            );
        });
    });

    describe('Restrições de atividade', () => {
        it('deve consultar apenas desafios ativos', async () => {
            await gateway.getByContext(validContext);

            expect(prisma.challenge.findFirst).toHaveBeenCalledWith(
                expectedQuery(validContext),
            );
        });

        it('deve exigir que o projeto esteja ativo', async () => {
            await gateway.getByContext(validContext);

            expect(prisma.challenge.findFirst).toHaveBeenCalledWith(
                expectedQuery(validContext),
            );
        });

        it('deve exigir que a aplicação esteja ativa', async () => {
            await gateway.getByContext(validContext);

            expect(prisma.challenge.findFirst).toHaveBeenCalledWith(
                expectedQuery(validContext),
            );
        });
    });

    describe('Retorno da consulta', () => {
        it('deve retornar a pontuação cadastrada do desafio', async () => {
            prisma.challenge.findFirst.mockResolvedValue({
                ...challenge,
                points: 100,
            });

            const result = await gateway.getByContext(validContext);

            expect(result?.points).toBe(100);
        });

        it('deve retornar um desafio com zero pontos', async () => {
            prisma.challenge.findFirst.mockResolvedValue({
                ...challenge,
                points: 0,
            });

            const result = await gateway.getByContext(validContext);

            expect(result?.points).toBe(0);
        });

        it('deve preservar todos os campos retornados pelo Prisma', async () => {
            const anotherChallenge: TChallenge = {
                id: 'challenge-2',
                name: 'Desafio avançado',
                iri: 'https://gamapi.dev/challenges/avancado',
                points: 150,
                active: true,
            };

            prisma.challenge.findFirst.mockResolvedValue(anotherChallenge);

            const result = await gateway.getByContext(validContext);

            expect(result).toEqual(anotherChallenge);
        });

        it('deve selecionar somente os campos necessários do desafio', async () => {
            await gateway.getByContext(validContext);

            expect(prisma.challenge.findFirst).toHaveBeenCalledWith(
                expectedQuery(validContext),
            );
        });
    });

    describe('Falhas do Prisma', () => {
        it('deve propagar erros de conexão com o banco', async () => {
            prisma.challenge.findFirst.mockRejectedValue(
                new Error('Falha na conexão com o banco de dados.'),
            );

            await expect(gateway.getByContext(validContext)).rejects.toThrow(
                'Falha na conexão com o banco de dados.',
            );
        });

        it('deve propagar erros inesperados da consulta', async () => {
            const databaseError = new Error('Erro inesperado na consulta.');

            prisma.challenge.findFirst.mockRejectedValue(databaseError);

            await expect(gateway.getByContext(validContext)).rejects.toBe(
                databaseError,
            );
        });

        it('não deve realizar consultas adicionais após uma falha', async () => {
            prisma.challenge.findFirst.mockRejectedValue(
                new Error('Banco indisponível.'),
            );

            await expect(gateway.getByContext(validContext)).rejects.toThrow();

            expect(prisma.challenge.findFirst).toHaveBeenCalledTimes(1);
        });
    });
});
