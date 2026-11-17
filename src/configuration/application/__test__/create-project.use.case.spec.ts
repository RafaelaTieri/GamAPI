import {
    BadRequestException,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';

import type {
    TCreateProject,
    TProject,
} from '../../domain/configuration.entities';
import type { ConfigurationGateway } from '../../domain/configuration.gateway';
import { CreateProjectUseCase } from '../create-project.use.case';

describe('CreateProjectUseCase', () => {
    let useCase: CreateProjectUseCase;

    let gateway: {
        findApplicationById: jest.Mock;
        findProjectByIri: jest.Mock;
        createProject: jest.Mock;
    };

    const APPLICATION_ID = 'application-1';
    const PROJECT_IRI = 'https://gamapi.dev/projects/ux';

    const validInput: TCreateProject = {
        name: 'Projeto UX',
        iri: PROJECT_IRI,
        applicationId: APPLICATION_ID,
    };

    const application = {
        id: APPLICATION_ID,
        name: 'Aplicação de Teste',
        iri: 'https://gamapi.dev/applications/teste',
        active: true,
    };

    const createdProject = {
        id: 'project-1',
        name: 'Projeto UX',
        iri: PROJECT_IRI,
        applicationId: APPLICATION_ID,
        active: true,
    } as TProject;

    beforeEach(() => {
        gateway = {
            findApplicationById: jest.fn().mockResolvedValue(application),
            findProjectByIri: jest.fn().mockResolvedValue(null),
            createProject: jest.fn().mockResolvedValue(createdProject),
        };

        useCase = new CreateProjectUseCase(
            gateway as unknown as ConfigurationGateway,
        );
    });

    describe('Validação dos dados', () => {
        it.each([
            ['nome vazio', { ...validInput, name: '' }],
            ['nome com espaços', { ...validInput, name: '   ' }],
            ['IRI vazia', { ...validInput, iri: '' }],
            ['IRI com espaços', { ...validInput, iri: '   ' }],
            ['applicationId vazio', { ...validInput, applicationId: '' }],
            ['nome e IRI vazios', { ...validInput, name: '', iri: '' }],
            ['nome undefined', { ...validInput, name: undefined }],
            ['IRI undefined', { ...validInput, iri: undefined }],
            [
                'applicationId undefined',
                { ...validInput, applicationId: undefined },
            ],
            ['nome null', { ...validInput, name: null }],
            ['IRI null', { ...validInput, iri: null }],
            ['applicationId null', { ...validInput, applicationId: null }],
        ])('deve rejeitar %s', async (_, input) => {
            await expect(
                useCase.execute(input as TCreateProject),
            ).rejects.toThrow('Informe os dados do projeto.');

            expect(gateway.findApplicationById).not.toHaveBeenCalled();
            expect(gateway.findProjectByIri).not.toHaveBeenCalled();
            expect(gateway.createProject).not.toHaveBeenCalled();
        });

        it('deve rejeitar entrada undefined', async () => {
            await expect(
                useCase.execute(undefined as unknown as TCreateProject),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findApplicationById).not.toHaveBeenCalled();
        });

        it('deve rejeitar entrada null', async () => {
            await expect(
                useCase.execute(null as unknown as TCreateProject),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.findApplicationById).not.toHaveBeenCalled();
        });

        it('deve rejeitar quando todos os campos estão vazios', async () => {
            await expect(
                useCase.execute({
                    name: '',
                    iri: '',
                    applicationId: '',
                }),
            ).rejects.toThrow(BadRequestException);

            expect(gateway.createProject).not.toHaveBeenCalled();
        });
    });

    describe('Validação da aplicação', () => {
        it('deve consultar a aplicação pelo ID', async () => {
            await useCase.execute(validInput);

            expect(gateway.findApplicationById).toHaveBeenCalledTimes(1);
            expect(gateway.findApplicationById).toHaveBeenCalledWith(
                APPLICATION_ID,
            );
        });

        it('deve rejeitar aplicação inexistente', async () => {
            gateway.findApplicationById.mockResolvedValue(null);

            await expect(useCase.execute(validInput)).rejects.toThrow(
                NotFoundException,
            );

            expect(gateway.findProjectByIri).not.toHaveBeenCalled();
            expect(gateway.createProject).not.toHaveBeenCalled();
        });

        it('deve retornar a mensagem correta para aplicação inexistente', async () => {
            gateway.findApplicationById.mockResolvedValue(null);

            await expect(useCase.execute(validInput)).rejects.toThrow(
                'Aplicação não encontrada ou inativa.',
            );
        });

        it('deve rejeitar aplicação inativa', async () => {
            gateway.findApplicationById.mockResolvedValue({
                ...application,
                active: false,
            });

            await expect(useCase.execute(validInput)).rejects.toThrow(
                NotFoundException,
            );

            expect(gateway.findProjectByIri).not.toHaveBeenCalled();
            expect(gateway.createProject).not.toHaveBeenCalled();
        });

        it('deve rejeitar aplicação retornada como undefined', async () => {
            gateway.findApplicationById.mockResolvedValue(undefined);

            await expect(useCase.execute(validInput)).rejects.toThrow(
                NotFoundException,
            );

            expect(gateway.findProjectByIri).not.toHaveBeenCalled();
        });

        it('deve propagar falha na consulta da aplicação', async () => {
            const error = new Error('Erro ao consultar aplicação.');

            gateway.findApplicationById.mockRejectedValue(error);

            await expect(useCase.execute(validInput)).rejects.toBe(error);

            expect(gateway.findProjectByIri).not.toHaveBeenCalled();
            expect(gateway.createProject).not.toHaveBeenCalled();
        });

        it('deve consultar a aplicação antes de verificar duplicidade', async () => {
            await useCase.execute(validInput);

            expect(
                gateway.findApplicationById.mock.invocationCallOrder[0],
            ).toBeLessThan(
                gateway.findProjectByIri.mock.invocationCallOrder[0],
            );
        });
    });

    describe('Verificação de duplicidade', () => {
        it('deve consultar o projeto pela IRI', async () => {
            await useCase.execute(validInput);

            expect(gateway.findProjectByIri).toHaveBeenCalledTimes(1);
            expect(gateway.findProjectByIri).toHaveBeenCalledWith(PROJECT_IRI);
        });

        it('deve rejeitar projeto já cadastrado', async () => {
            gateway.findProjectByIri.mockResolvedValue(createdProject);

            await expect(useCase.execute(validInput)).rejects.toThrow(
                ConflictException,
            );

            expect(gateway.createProject).not.toHaveBeenCalled();
        });

        it('deve retornar a mensagem correta para duplicidade', async () => {
            gateway.findProjectByIri.mockResolvedValue(createdProject);

            await expect(useCase.execute(validInput)).rejects.toThrow(
                'Projeto já cadastrado.',
            );
        });

        it('deve rejeitar projeto duplicado mesmo quando inativo', async () => {
            gateway.findProjectByIri.mockResolvedValue({
                ...createdProject,
                active: false,
            });

            await expect(useCase.execute(validInput)).rejects.toThrow(
                ConflictException,
            );

            expect(gateway.createProject).not.toHaveBeenCalled();
        });

        it('deve permitir criação quando a consulta retorna null', async () => {
            gateway.findProjectByIri.mockResolvedValue(null);

            const result = await useCase.execute(validInput);

            expect(result).toEqual(createdProject);
        });

        it('deve permitir criação quando a consulta retorna undefined', async () => {
            gateway.findProjectByIri.mockResolvedValue(undefined);

            const result = await useCase.execute(validInput);

            expect(result).toEqual(createdProject);
        });

        it('deve propagar falha na consulta de duplicidade', async () => {
            const error = new Error('Erro ao consultar projeto.');

            gateway.findProjectByIri.mockRejectedValue(error);

            await expect(useCase.execute(validInput)).rejects.toBe(error);

            expect(gateway.createProject).not.toHaveBeenCalled();
        });
    });

    describe('Criação do projeto', () => {
        it('deve criar um projeto com os dados corretos', async () => {
            const result = await useCase.execute(validInput);

            expect(gateway.createProject).toHaveBeenCalledTimes(1);
            expect(gateway.createProject).toHaveBeenCalledWith({
                name: 'Projeto UX',
                iri: PROJECT_IRI,
                applicationId: APPLICATION_ID,
            });

            expect(result).toEqual(createdProject);
        });

        it('deve remover espaços do início e fim do nome', async () => {
            await useCase.execute({
                ...validInput,
                name: '  Projeto UX  ',
            });

            expect(gateway.createProject).toHaveBeenCalledWith({
                name: 'Projeto UX',
                iri: PROJECT_IRI,
                applicationId: APPLICATION_ID,
            });
        });

        it('deve remover espaços do início e fim da IRI', async () => {
            await useCase.execute({
                ...validInput,
                iri: `  ${PROJECT_IRI}  `,
            });

            expect(gateway.findProjectByIri).toHaveBeenCalledWith(PROJECT_IRI);

            expect(gateway.createProject).toHaveBeenCalledWith({
                name: 'Projeto UX',
                iri: PROJECT_IRI,
                applicationId: APPLICATION_ID,
            });
        });

        it('deve normalizar nome e IRI simultaneamente', async () => {
            await useCase.execute({
                name: '\t Projeto UX \n',
                iri: `\n ${PROJECT_IRI} \t`,
                applicationId: APPLICATION_ID,
            });

            expect(gateway.createProject).toHaveBeenCalledWith({
                name: 'Projeto UX',
                iri: PROJECT_IRI,
                applicationId: APPLICATION_ID,
            });
        });

        it('deve preservar espaços internos do nome', async () => {
            await useCase.execute({
                ...validInput,
                name: '  Projeto  de  UX  ',
            });

            expect(gateway.createProject).toHaveBeenCalledWith({
                name: 'Projeto  de  UX',
                iri: PROJECT_IRI,
                applicationId: APPLICATION_ID,
            });
        });

        it('deve preservar o applicationId recebido', async () => {
            const anotherApplicationId = 'application-2';

            await useCase.execute({
                ...validInput,
                applicationId: anotherApplicationId,
            });

            expect(gateway.findApplicationById).toHaveBeenCalledWith(
                anotherApplicationId,
            );

            expect(gateway.createProject).toHaveBeenCalledWith({
                name: validInput.name,
                iri: PROJECT_IRI,
                applicationId: anotherApplicationId,
            });
        });

        it('deve retornar exatamente o projeto criado pelo gateway', async () => {
            const anotherProject = {
                id: 'project-2',
                name: 'Projeto Avançado',
                iri: 'https://gamapi.dev/projects/avancado',
                applicationId: APPLICATION_ID,
                active: true,
            } as TProject;

            gateway.createProject.mockResolvedValue(anotherProject);

            const result = await useCase.execute({
                name: anotherProject.name,
                iri: anotherProject.iri,
                applicationId: APPLICATION_ID,
            });

            expect(result).toBe(anotherProject);
        });

        it('deve propagar falhas na criação do projeto', async () => {
            const error = new Error('Falha ao criar projeto.');

            gateway.createProject.mockRejectedValue(error);

            await expect(useCase.execute(validInput)).rejects.toBe(error);

            expect(gateway.createProject).toHaveBeenCalledTimes(1);
        });
    });
});
