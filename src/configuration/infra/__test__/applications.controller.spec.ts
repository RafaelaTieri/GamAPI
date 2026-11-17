import {
    BadRequestException,
    ConflictException,
    InternalServerErrorException,
} from '@nestjs/common';

import type { CreateApplicationUseCase } from '../../application/create-application.use.case';
import type {
    TApplication,
    TCreateApplication,
} from '../../domain/configuration.entities';

import { ApplicationsController } from '../applications.controller';

describe('ApplicationsController', () => {
    let controller: ApplicationsController;

    let createApplicationUseCase: {
        execute: jest.Mock;
    };

    const validInput: TCreateApplication = {
        name: 'Aplicação Educacional',
        iri: 'https://gamapi.dev/applications/educacional',
    };

    const createdApplication: TApplication = {
        id: 'application-1',
        name: validInput.name,
        iri: validInput.iri,
        active: true,
    };

    beforeEach(() => {
        createApplicationUseCase = {
            execute: jest.fn().mockResolvedValue(createdApplication),
        };

        controller = new ApplicationsController(
            createApplicationUseCase as unknown as CreateApplicationUseCase,
        );
    });

    describe('create', () => {
        it('deve encaminhar os dados ao CreateApplicationUseCase', async () => {
            await controller.create(validInput);

            expect(createApplicationUseCase.execute).toHaveBeenCalledTimes(1);

            expect(createApplicationUseCase.execute).toHaveBeenCalledWith(
                validInput,
            );
        });

        it('deve retornar a aplicação criada', async () => {
            const result = await controller.create(validInput);

            expect(result).toEqual(createdApplication);
        });

        it('deve retornar exatamente o objeto recebido do Use Case', async () => {
            const result = await controller.create(validInput);

            expect(result).toBe(createdApplication);
        });

        it('deve permitir criar aplicações diferentes', async () => {
            const anotherInput: TCreateApplication = {
                name: 'Aplicação de Matemática',
                iri: 'https://gamapi.dev/applications/matematica',
            };

            const anotherApplication: TApplication = {
                id: 'application-2',
                ...anotherInput,
                active: true,
            };

            createApplicationUseCase.execute.mockResolvedValue(
                anotherApplication,
            );

            const result = await controller.create(anotherInput);

            expect(createApplicationUseCase.execute).toHaveBeenCalledWith(
                anotherInput,
            );

            expect(result).toEqual(anotherApplication);
        });

        it('deve preservar os dados originais enviados ao Use Case', async () => {
            const input: TCreateApplication = {
                name: '  Aplicação Educacional  ',
                iri: '  https://gamapi.dev/applications/educacional  ',
            };

            await controller.create(input);

            expect(createApplicationUseCase.execute).toHaveBeenCalledWith(
                input,
            );
        });

        it('deve encaminhar nome vazio para validação do Use Case', async () => {
            const input: TCreateApplication = {
                name: '',
                iri: validInput.iri,
            };

            await controller.create(input);

            expect(createApplicationUseCase.execute).toHaveBeenCalledWith(
                input,
            );
        });

        it('deve encaminhar IRI vazia para validação do Use Case', async () => {
            const input: TCreateApplication = {
                name: validInput.name,
                iri: '',
            };

            await controller.create(input);

            expect(createApplicationUseCase.execute).toHaveBeenCalledWith(
                input,
            );
        });

        it('deve propagar BadRequestException do Use Case', async () => {
            createApplicationUseCase.execute.mockRejectedValue(
                new BadRequestException('Informe o nome e a IRI da aplicação.'),
            );

            await expect(
                controller.create({
                    name: '',
                    iri: '',
                }),
            ).rejects.toThrow(BadRequestException);

            expect(createApplicationUseCase.execute).toHaveBeenCalledTimes(1);
        });

        it('deve preservar a mensagem de dados inválidos', async () => {
            createApplicationUseCase.execute.mockRejectedValue(
                new BadRequestException('Informe o nome e a IRI da aplicação.'),
            );

            await expect(controller.create(validInput)).rejects.toThrow(
                'Informe o nome e a IRI da aplicação.',
            );
        });

        it('deve propagar ConflictException para aplicação duplicada', async () => {
            createApplicationUseCase.execute.mockRejectedValue(
                new ConflictException('Aplicação já cadastrada.'),
            );

            await expect(controller.create(validInput)).rejects.toThrow(
                ConflictException,
            );
        });

        it('deve preservar a mensagem de aplicação duplicada', async () => {
            createApplicationUseCase.execute.mockRejectedValue(
                new ConflictException('Aplicação já cadastrada.'),
            );

            await expect(controller.create(validInput)).rejects.toThrow(
                'Aplicação já cadastrada.',
            );
        });

        it('deve propagar erros internos do Use Case', async () => {
            createApplicationUseCase.execute.mockRejectedValue(
                new InternalServerErrorException(
                    'Erro interno ao criar aplicação.',
                ),
            );

            await expect(controller.create(validInput)).rejects.toThrow(
                InternalServerErrorException,
            );
        });

        it('deve propagar erros inesperados', async () => {
            const error = new Error(
                'Falha na comunicação com o banco de dados.',
            );

            createApplicationUseCase.execute.mockRejectedValue(error);

            await expect(controller.create(validInput)).rejects.toBe(error);
        });

        it('não deve modificar os dados recebidos', async () => {
            const input: TCreateApplication = {
                ...validInput,
            };

            const originalInput = {
                ...input,
            };

            await controller.create(input);

            expect(input).toEqual(originalInput);
        });
    });
});
