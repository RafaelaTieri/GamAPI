import { BadRequestException, ConflictException } from '@nestjs/common';

import type {
    TChallenge,
    TCreateChallenge,
} from '../../../challenges/domain/challenge.entities';
import type { ConfigurationGateway } from '../../domain/configuration.gateway';
import { CreateChallengeUseCase } from '../create-challenge.use.case';

describe('CreateChallengeUseCase', () => {
    let useCase: CreateChallengeUseCase;

    let gateway: {
        findChallengeByIri: jest.Mock;
        createChallenge: jest.Mock;
    };

    const CHALLENGE_IRI = 'https://gamapi.dev/challenges/ux';

    const validInput: TCreateChallenge = {
        name: 'Desafio de UX',
        iri: CHALLENGE_IRI,
        points: 40,
    };

    const createdChallenge: TChallenge = {
        id: 'challenge-1',
        name: validInput.name,
        iri: validInput.iri,
        points: validInput.points,
        active: true,
    };

    beforeEach(() => {
        gateway = {
            findChallengeByIri: jest.fn().mockResolvedValue(null),
            createChallenge: jest.fn().mockResolvedValue(createdChallenge),
        };

        useCase = new CreateChallengeUseCase(
            gateway as unknown as ConfigurationGateway,
        );
    });

    describe('Validação do nome', () => {
        it('deve rejeitar nome vazio', async () => {
            await expect(
                useCase.execute({
                    ...validInput,
                    name: '',
                }),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findChallengeByIri).not.toHaveBeenCalled();
            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });

        it('deve rejeitar nome contendo apenas espaços', async () => {
            await expect(
                useCase.execute({
                    ...validInput,
                    name: '   ',
                }),
            ).rejects.toThrow('Informe o nome e a IRI do desafio.');

            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });

        it('deve rejeitar nome undefined', async () => {
            await expect(
                useCase.execute({
                    ...validInput,
                    name: undefined,
                } as unknown as TCreateChallenge),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findChallengeByIri).not.toHaveBeenCalled();
        });

        it('deve rejeitar nome null', async () => {
            await expect(
                useCase.execute({
                    ...validInput,
                    name: null,
                } as unknown as TCreateChallenge),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findChallengeByIri).not.toHaveBeenCalled();
        });

        it('deve rejeitar entrada sem a propriedade name', async () => {
            await expect(
                useCase.execute({
                    iri: CHALLENGE_IRI,
                    points: 40,
                } as TCreateChallenge),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });
    });

    describe('Validação da IRI', () => {
        it('deve rejeitar IRI vazia', async () => {
            await expect(
                useCase.execute({
                    ...validInput,
                    iri: '',
                }),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findChallengeByIri).not.toHaveBeenCalled();
        });

        it('deve rejeitar IRI contendo apenas espaços', async () => {
            await expect(
                useCase.execute({
                    ...validInput,
                    iri: '   ',
                }),
            ).rejects.toThrow('Informe o nome e a IRI do desafio.');

            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });

        it('deve rejeitar IRI undefined', async () => {
            await expect(
                useCase.execute({
                    ...validInput,
                    iri: undefined,
                } as unknown as TCreateChallenge),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findChallengeByIri).not.toHaveBeenCalled();
        });

        it('deve rejeitar IRI null', async () => {
            await expect(
                useCase.execute({
                    ...validInput,
                    iri: null,
                } as unknown as TCreateChallenge),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findChallengeByIri).not.toHaveBeenCalled();
        });

        it('deve rejeitar entrada sem a propriedade iri', async () => {
            await expect(
                useCase.execute({
                    name: 'Desafio de UX',
                    points: 40,
                } as TCreateChallenge),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });
    });

    describe('Validação da entrada', () => {
        it('deve rejeitar entrada undefined', async () => {
            await expect(
                useCase.execute(undefined as unknown as TCreateChallenge),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findChallengeByIri).not.toHaveBeenCalled();
            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });

        it('deve rejeitar entrada null', async () => {
            await expect(
                useCase.execute(null as unknown as TCreateChallenge),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findChallengeByIri).not.toHaveBeenCalled();
            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });

        it('deve rejeitar nome e IRI vazios', async () => {
            await expect(
                useCase.execute({
                    name: '',
                    iri: '',
                    points: 40,
                }),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });

        it('deve rejeitar objeto vazio', async () => {
            await expect(
                useCase.execute({} as TCreateChallenge),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });
    });

    describe('Validação da pontuação', () => {
        it('deve aceitar pontuação inteira positiva', async () => {
            await useCase.execute(validInput);

            expect(gateway.createChallenge).toHaveBeenCalledWith({
                name: validInput.name,
                iri: validInput.iri,
                points: 40,
            });
        });

        it('deve aceitar pontuação zero', async () => {
            await useCase.execute({
                ...validInput,
                points: 0,
            });

            expect(gateway.createChallenge).toHaveBeenCalledWith({
                ...validInput,
                points: 0,
            });
        });

        it('deve aceitar pontuação inteira negativa zero', async () => {
            await useCase.execute({
                ...validInput,
                points: -0,
            });

            expect(gateway.createChallenge).toHaveBeenCalledWith({
                ...validInput,
                points: -0,
            });
        });

        it('deve aceitar pontuação inteira grande', async () => {
            await useCase.execute({
                ...validInput,
                points: Number.MAX_SAFE_INTEGER,
            });

            expect(gateway.createChallenge).toHaveBeenCalledWith({
                ...validInput,
                points: Number.MAX_SAFE_INTEGER,
            });
        });

        it('deve rejeitar pontuação negativa', async () => {
            await expect(
                useCase.execute({
                    ...validInput,
                    points: -1,
                }),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findChallengeByIri).not.toHaveBeenCalled();
            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });

        it('deve rejeitar pontuação negativa grande', async () => {
            await expect(
                useCase.execute({
                    ...validInput,
                    points: -100,
                }),
            ).rejects.toThrow('Informe uma pontuação válida.');

            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });

        it('deve rejeitar pontuação decimal positiva', async () => {
            await expect(
                useCase.execute({
                    ...validInput,
                    points: 10.5,
                }),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });

        it('deve rejeitar pontuação decimal negativa', async () => {
            await expect(
                useCase.execute({
                    ...validInput,
                    points: -0.5,
                }),
            ).rejects.toThrow('Informe uma pontuação válida.');

            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });

        it('deve rejeitar NaN', async () => {
            await expect(
                useCase.execute({
                    ...validInput,
                    points: NaN,
                }),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });

        it('deve rejeitar Infinity', async () => {
            await expect(
                useCase.execute({
                    ...validInput,
                    points: Infinity,
                }),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });

        it('deve rejeitar -Infinity', async () => {
            await expect(
                useCase.execute({
                    ...validInput,
                    points: -Infinity,
                }),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });

        it('deve rejeitar pontuação undefined', async () => {
            await expect(
                useCase.execute({
                    ...validInput,
                    points: undefined,
                } as unknown as TCreateChallenge),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });

        it('deve rejeitar pontuação null', async () => {
            await expect(
                useCase.execute({
                    ...validInput,
                    points: null,
                } as unknown as TCreateChallenge),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });

        it('deve rejeitar pontuação como string', async () => {
            await expect(
                useCase.execute({
                    ...validInput,
                    points: '40',
                } as unknown as TCreateChallenge),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });

        it('deve rejeitar pontuação como boolean', async () => {
            await expect(
                useCase.execute({
                    ...validInput,
                    points: true,
                } as unknown as TCreateChallenge),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });

        it('não deve consultar duplicidade quando a pontuação é inválida', async () => {
            await expect(
                useCase.execute({
                    ...validInput,
                    points: -10,
                }),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findChallengeByIri).not.toHaveBeenCalled();
        });
    });

    describe('Consulta de desafios existentes', () => {
        it('deve consultar a IRI informada', async () => {
            await useCase.execute(validInput);

            expect(gateway.findChallengeByIri).toHaveBeenCalledTimes(1);
            expect(gateway.findChallengeByIri).toHaveBeenCalledWith(
                CHALLENGE_IRI,
            );
        });

        it('deve rejeitar desafio já cadastrado', async () => {
            gateway.findChallengeByIri.mockResolvedValue(createdChallenge);

            await expect(useCase.execute(validInput)).rejects.toThrow(
                ConflictException,
            );

            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });

        it('deve retornar a mensagem correta para desafio duplicado', async () => {
            gateway.findChallengeByIri.mockResolvedValue(createdChallenge);

            await expect(useCase.execute(validInput)).rejects.toThrow(
                'Desafio já cadastrado.',
            );
        });

        it('deve rejeitar duplicidade mesmo com desafio inativo', async () => {
            gateway.findChallengeByIri.mockResolvedValue({
                ...createdChallenge,
                active: false,
            });

            await expect(useCase.execute(validInput)).rejects.toThrow(
                ConflictException,
            );

            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });

        it('deve permitir criação quando a consulta retorna null', async () => {
            gateway.findChallengeByIri.mockResolvedValue(null);

            const result = await useCase.execute(validInput);

            expect(result).toEqual(createdChallenge);
        });

        it('deve permitir criação quando a consulta retorna undefined', async () => {
            gateway.findChallengeByIri.mockResolvedValue(undefined);

            const result = await useCase.execute(validInput);

            expect(result).toEqual(createdChallenge);
        });

        it('deve propagar erros na consulta de desafios', async () => {
            gateway.findChallengeByIri.mockRejectedValue(
                new Error('Falha ao consultar desafio.'),
            );

            await expect(useCase.execute(validInput)).rejects.toThrow(
                'Falha ao consultar desafio.',
            );

            expect(gateway.createChallenge).not.toHaveBeenCalled();
        });
    });

    describe('Criação do desafio', () => {
        it('deve criar um desafio válido', async () => {
            const result = await useCase.execute(validInput);

            expect(gateway.createChallenge).toHaveBeenCalledTimes(1);
            expect(gateway.createChallenge).toHaveBeenCalledWith(validInput);

            expect(result).toEqual(createdChallenge);
        });

        it('deve remover espaços no início e no fim do nome', async () => {
            await useCase.execute({
                ...validInput,
                name: '  Desafio de UX  ',
            });

            expect(gateway.createChallenge).toHaveBeenCalledWith({
                ...validInput,
                name: 'Desafio de UX',
            });
        });

        it('deve remover espaços no início e no fim da IRI', async () => {
            await useCase.execute({
                ...validInput,
                iri: `  ${CHALLENGE_IRI}  `,
            });

            expect(gateway.findChallengeByIri).toHaveBeenCalledWith(
                CHALLENGE_IRI,
            );

            expect(gateway.createChallenge).toHaveBeenCalledWith(validInput);
        });

        it('deve normalizar nome e IRI simultaneamente', async () => {
            await useCase.execute({
                name: ' \t Desafio de UX \n ',
                iri: ` \n ${CHALLENGE_IRI} \t `,
                points: 40,
            });

            expect(gateway.createChallenge).toHaveBeenCalledWith(validInput);
        });

        it('deve preservar espaços internos do nome', async () => {
            await useCase.execute({
                ...validInput,
                name: '  Desafio  de  UX  ',
            });

            expect(gateway.createChallenge).toHaveBeenCalledWith({
                ...validInput,
                name: 'Desafio  de  UX',
            });
        });

        it('deve retornar exatamente o desafio criado pelo gateway', async () => {
            const anotherChallenge: TChallenge = {
                id: 'challenge-2',
                name: 'Desafio Avançado',
                iri: 'https://gamapi.dev/challenges/avancado',
                points: 100,
                active: true,
            };

            gateway.createChallenge.mockResolvedValue(anotherChallenge);

            const result = await useCase.execute({
                name: anotherChallenge.name,
                iri: anotherChallenge.iri,
                points: anotherChallenge.points,
            });

            expect(result).toBe(anotherChallenge);
        });

        it('deve propagar falhas durante a criação', async () => {
            gateway.createChallenge.mockRejectedValue(
                new Error('Falha ao criar desafio.'),
            );

            await expect(useCase.execute(validInput)).rejects.toThrow(
                'Falha ao criar desafio.',
            );

            expect(gateway.createChallenge).toHaveBeenCalledTimes(1);
        });

        it('deve preservar o erro original da criação', async () => {
            const error = new Error('Erro de persistência.');

            gateway.createChallenge.mockRejectedValue(error);

            await expect(useCase.execute(validInput)).rejects.toBe(error);
        });
    });
});
