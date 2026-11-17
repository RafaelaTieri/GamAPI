import { BadRequestException, ConflictException } from '@nestjs/common';

import type {
    TApplication,
    TCreateApplication,
} from '../../domain/configuration.entities';
import type { ConfigurationGateway } from '../../domain/configuration.gateway';
import { CreateApplicationUseCase } from '../create-application.use.case';

describe('CreateApplicationUseCase', () => {
    let useCase: CreateApplicationUseCase;

    let gateway: {
        findApplicationByIri: jest.Mock;
        createApplication: jest.Mock;
    };

    const APPLICATION_IRI = 'https://gamapi.dev/applications/teste';

    const validInput: TCreateApplication = {
        name: 'Aplicação de Teste',
        iri: APPLICATION_IRI,
    };

    const createdApplication = {
        id: 'application-1',
        name: validInput.name,
        iri: validInput.iri,
        active: true,
    } as TApplication;

    beforeEach(() => {
        gateway = {
            findApplicationByIri: jest.fn().mockResolvedValue(null),
            createApplication: jest.fn().mockResolvedValue(createdApplication),
        };

        useCase = new CreateApplicationUseCase(
            gateway as unknown as ConfigurationGateway,
        );
    });

    describe('Validação dos dados', () => {
        it('deve rejeitar nome vazio', async () => {
            await expect(
                useCase.execute({
                    name: '',
                    iri: APPLICATION_IRI,
                }),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findApplicationByIri).not.toHaveBeenCalled();
            expect(gateway.createApplication).not.toHaveBeenCalled();
        });

        it('deve rejeitar nome contendo apenas espaços', async () => {
            await expect(
                useCase.execute({
                    name: '   ',
                    iri: APPLICATION_IRI,
                }),
            ).rejects.toThrow('Informe o nome e a IRI da aplicação.');

            expect(gateway.findApplicationByIri).not.toHaveBeenCalled();
        });

        it('deve rejeitar IRI vazia', async () => {
            await expect(
                useCase.execute({
                    name: 'Aplicação de Teste',
                    iri: '',
                }),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findApplicationByIri).not.toHaveBeenCalled();
            expect(gateway.createApplication).not.toHaveBeenCalled();
        });

        it('deve rejeitar IRI contendo apenas espaços', async () => {
            await expect(
                useCase.execute({
                    name: 'Aplicação de Teste',
                    iri: '   ',
                }),
            ).rejects.toThrow('Informe o nome e a IRI da aplicação.');

            expect(gateway.findApplicationByIri).not.toHaveBeenCalled();
        });

        it('deve rejeitar nome e IRI vazios', async () => {
            await expect(
                useCase.execute({
                    name: '',
                    iri: '',
                }),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findApplicationByIri).not.toHaveBeenCalled();
        });

        it('deve rejeitar entrada undefined', async () => {
            await expect(
                useCase.execute(undefined as unknown as TCreateApplication),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findApplicationByIri).not.toHaveBeenCalled();
        });

        it('deve rejeitar entrada null', async () => {
            await expect(
                useCase.execute(null as unknown as TCreateApplication),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findApplicationByIri).not.toHaveBeenCalled();
        });

        it('deve rejeitar entrada sem nome', async () => {
            const input = {
                iri: APPLICATION_IRI,
            } as TCreateApplication;

            await expect(useCase.execute(input)).rejects.toThrow(
                BadRequestException,
            );

            expect(gateway.findApplicationByIri).not.toHaveBeenCalled();
        });

        it('deve rejeitar entrada sem IRI', async () => {
            const input = {
                name: 'Aplicação de Teste',
            } as TCreateApplication;

            await expect(useCase.execute(input)).rejects.toThrow(
                BadRequestException,
            );

            expect(gateway.findApplicationByIri).not.toHaveBeenCalled();
        });

        it('deve rejeitar nome null', async () => {
            const input = {
                name: null,
                iri: APPLICATION_IRI,
            } as unknown as TCreateApplication;

            await expect(useCase.execute(input)).rejects.toThrow(
                BadRequestException,
            );

            expect(gateway.createApplication).not.toHaveBeenCalled();
        });

        it('deve rejeitar IRI null', async () => {
            const input = {
                name: 'Aplicação de Teste',
                iri: null,
            } as unknown as TCreateApplication;

            await expect(useCase.execute(input)).rejects.toThrow(
                BadRequestException,
            );

            expect(gateway.createApplication).not.toHaveBeenCalled();
        });

        it('deve rejeitar nome undefined', async () => {
            const input = {
                name: undefined,
                iri: APPLICATION_IRI,
            } as unknown as TCreateApplication;

            await expect(useCase.execute(input)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('deve rejeitar IRI undefined', async () => {
            const input = {
                name: 'Aplicação de Teste',
                iri: undefined,
            } as unknown as TCreateApplication;

            await expect(useCase.execute(input)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('Consulta de aplicações existentes', () => {
        it('deve consultar a aplicação pela IRI', async () => {
            await useCase.execute(validInput);

            expect(gateway.findApplicationByIri).toHaveBeenCalledTimes(1);
            expect(gateway.findApplicationByIri).toHaveBeenCalledWith(
                APPLICATION_IRI,
            );
        });

        it('deve rejeitar aplicação já cadastrada', async () => {
            gateway.findApplicationByIri.mockResolvedValue(createdApplication);

            await expect(useCase.execute(validInput)).rejects.toThrow(
                ConflictException,
            );

            expect(gateway.findApplicationByIri).toHaveBeenCalledWith(
                APPLICATION_IRI,
            );

            expect(gateway.createApplication).not.toHaveBeenCalled();
        });

        it('deve retornar a mensagem correta para aplicação duplicada', async () => {
            gateway.findApplicationByIri.mockResolvedValue(createdApplication);

            await expect(useCase.execute(validInput)).rejects.toThrow(
                'Aplicação já cadastrada.',
            );
        });

        it('deve rejeitar duplicidade mesmo quando a aplicação está inativa', async () => {
            gateway.findApplicationByIri.mockResolvedValue({
                ...createdApplication,
                active: false,
            });

            await expect(useCase.execute(validInput)).rejects.toThrow(
                ConflictException,
            );

            expect(gateway.createApplication).not.toHaveBeenCalled();
        });

        it('deve permitir criação quando a consulta retorna null', async () => {
            gateway.findApplicationByIri.mockResolvedValue(null);

            const result = await useCase.execute(validInput);

            expect(result).toEqual(createdApplication);
        });

        it('deve permitir criação quando a consulta retorna undefined', async () => {
            gateway.findApplicationByIri.mockResolvedValue(undefined);

            const result = await useCase.execute(validInput);

            expect(result).toEqual(createdApplication);
        });

        it('deve propagar erros na consulta de aplicações', async () => {
            gateway.findApplicationByIri.mockRejectedValue(
                new Error('Falha ao consultar aplicação.'),
            );

            await expect(useCase.execute(validInput)).rejects.toThrow(
                'Falha ao consultar aplicação.',
            );

            expect(gateway.createApplication).not.toHaveBeenCalled();
        });
    });

    describe('Criação da aplicação', () => {
        it('deve criar uma aplicação com os dados informados', async () => {
            const result = await useCase.execute(validInput);

            expect(gateway.createApplication).toHaveBeenCalledTimes(1);
            expect(gateway.createApplication).toHaveBeenCalledWith({
                name: 'Aplicação de Teste',
                iri: APPLICATION_IRI,
            });

            expect(result).toEqual(createdApplication);
        });

        it('deve remover espaços no início e no fim do nome', async () => {
            await useCase.execute({
                name: '  Aplicação de Teste  ',
                iri: APPLICATION_IRI,
            });

            expect(gateway.createApplication).toHaveBeenCalledWith({
                name: 'Aplicação de Teste',
                iri: APPLICATION_IRI,
            });
        });

        it('deve remover espaços no início e no fim da IRI', async () => {
            await useCase.execute({
                name: 'Aplicação de Teste',
                iri: `  ${APPLICATION_IRI}  `,
            });

            expect(gateway.findApplicationByIri).toHaveBeenCalledWith(
                APPLICATION_IRI,
            );

            expect(gateway.createApplication).toHaveBeenCalledWith({
                name: 'Aplicação de Teste',
                iri: APPLICATION_IRI,
            });
        });

        it('deve normalizar nome e IRI simultaneamente', async () => {
            await useCase.execute({
                name: '\t Aplicação de Teste \n',
                iri: `\n ${APPLICATION_IRI} \t`,
            });

            expect(gateway.findApplicationByIri).toHaveBeenCalledWith(
                APPLICATION_IRI,
            );

            expect(gateway.createApplication).toHaveBeenCalledWith({
                name: 'Aplicação de Teste',
                iri: APPLICATION_IRI,
            });
        });

        it('deve preservar espaços internos do nome', async () => {
            await useCase.execute({
                name: '  Aplicação de  Teste  ',
                iri: APPLICATION_IRI,
            });

            expect(gateway.createApplication).toHaveBeenCalledWith({
                name: 'Aplicação de  Teste',
                iri: APPLICATION_IRI,
            });
        });

        it('deve retornar exatamente a aplicação criada pelo gateway', async () => {
            const anotherApplication = {
                id: 'application-2',
                name: 'Outra Aplicação',
                iri: 'https://gamapi.dev/applications/outra',
                active: true,
            } as TApplication;

            gateway.createApplication.mockResolvedValue(anotherApplication);

            const result = await useCase.execute({
                name: 'Outra Aplicação',
                iri: anotherApplication.iri,
            });

            expect(result).toBe(anotherApplication);
        });

        it('deve propagar falhas na criação da aplicação', async () => {
            gateway.createApplication.mockRejectedValue(
                new Error('Falha ao criar aplicação.'),
            );

            await expect(useCase.execute(validInput)).rejects.toThrow(
                'Falha ao criar aplicação.',
            );

            expect(gateway.createApplication).toHaveBeenCalledTimes(1);
        });

        it('deve preservar o erro original da criação', async () => {
            const error = new Error('Erro de persistência.');

            gateway.createApplication.mockRejectedValue(error);

            await expect(useCase.execute(validInput)).rejects.toBe(error);
        });
    });
});
