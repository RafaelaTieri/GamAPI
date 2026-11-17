import {
    BadRequestException,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';

import type { AddChallengeToProjectUseCase } from '../../application/add-challenge-to-project.use.case';
import type { CreateProjectUseCase } from '../../application/create-project.use.case';
import type {
    TCreateProject,
    TProject,
} from '../../domain/configuration.entities';
import { ProjectsController } from '../projects.controller';

describe('ProjectsController', () => {
    let controller: ProjectsController;

    let createProjectMock: jest.Mock<Promise<TProject>, [TCreateProject]>;

    let addChallengeMock: jest.Mock<Promise<void>, [string, string]>;

    const PROJECT_ID = 'project-1';
    const APPLICATION_ID = 'application-1';
    const CHALLENGE_ID = 'challenge-1';

    const validInput: TCreateProject = {
        name: 'Projeto UX',
        iri: 'https://gamapi.dev/projects/ux',
        applicationId: APPLICATION_ID,
    };

    const createdProject: TProject = {
        id: PROJECT_ID,
        ...validInput,
        active: true,
    };

    beforeEach(() => {
        createProjectMock = jest
            .fn<Promise<TProject>, [TCreateProject]>()
            .mockResolvedValue(createdProject);

        addChallengeMock = jest
            .fn<Promise<void>, [string, string]>()
            .mockResolvedValue(undefined);

        controller = new ProjectsController(
            {
                execute: createProjectMock,
            } as unknown as CreateProjectUseCase,
            {
                execute: addChallengeMock,
            } as unknown as AddChallengeToProjectUseCase,
        );
    });

    describe('create', () => {
        it('deve encaminhar os dados ao CreateProjectUseCase', async () => {
            await controller.create(validInput);

            expect(createProjectMock).toHaveBeenCalledTimes(1);
            expect(createProjectMock).toHaveBeenCalledWith(validInput);
            expect(addChallengeMock).not.toHaveBeenCalled();
        });

        it('deve retornar o projeto criado pelo Use Case', async () => {
            const result = await controller.create(validInput);

            expect(result).toEqual(createdProject);
            expect(result).toBe(createdProject);
        });

        it('deve preservar todos os dados enviados', async () => {
            const input: TCreateProject = {
                name: '  Projeto Avançado  ',
                iri: '  https://gamapi.dev/projects/avancado  ',
                applicationId: 'application-2',
            };

            const originalInput = { ...input };

            await controller.create(input);

            expect(createProjectMock).toHaveBeenCalledWith(input);
            expect(input).toEqual(originalInput);
        });

        it('deve retornar o projeto fornecido pelo Use Case', async () => {
            const anotherProject: TProject = {
                id: 'project-2',
                name: 'Projeto Avançado',
                iri: 'https://gamapi.dev/projects/avancado',
                applicationId: 'application-2',
                active: true,
            };

            createProjectMock.mockResolvedValue(anotherProject);

            const result = await controller.create({
                name: anotherProject.name,
                iri: anotherProject.iri,
                applicationId: anotherProject.applicationId,
            });

            expect(result).toBe(anotherProject);
        });

        it('deve encaminhar dados inválidos para validação do Use Case', async () => {
            const invalidInput: TCreateProject = {
                name: '',
                iri: '',
                applicationId: '',
            };

            await controller.create(invalidInput);

            expect(createProjectMock).toHaveBeenCalledWith(invalidInput);
        });

        it('deve propagar BadRequestException', async () => {
            const error = new BadRequestException(
                'Informe os dados do projeto.',
            );

            createProjectMock.mockRejectedValue(error);

            await expect(
                controller.create({
                    ...validInput,
                    name: '',
                }),
            ).rejects.toBe(error);

            expect(createProjectMock).toHaveBeenCalledTimes(1);
        });

        it('deve propagar NotFoundException', async () => {
            const error = new NotFoundException(
                'Aplicação não encontrada ou inativa.',
            );

            createProjectMock.mockRejectedValue(error);

            await expect(controller.create(validInput)).rejects.toBe(error);
        });

        it('deve propagar ConflictException', async () => {
            const error = new ConflictException('Projeto já cadastrado.');

            createProjectMock.mockRejectedValue(error);

            await expect(controller.create(validInput)).rejects.toBe(error);
        });

        it('deve propagar erros inesperados do Use Case', async () => {
            const error = new Error('Falha ao criar projeto.');

            createProjectMock.mockRejectedValue(error);

            await expect(controller.create(validInput)).rejects.toBe(error);
        });
    });

    describe('addChallenge', () => {
        it('deve encaminhar o projeto e o desafio ao Use Case', async () => {
            await controller.addChallenge(PROJECT_ID, CHALLENGE_ID);

            expect(addChallengeMock).toHaveBeenCalledTimes(1);
            expect(addChallengeMock).toHaveBeenCalledWith(
                PROJECT_ID,
                CHALLENGE_ID,
            );

            expect(createProjectMock).not.toHaveBeenCalled();
        });

        it('deve retornar linked true após associar o desafio', async () => {
            const result = await controller.addChallenge(
                PROJECT_ID,
                CHALLENGE_ID,
            );

            expect(result).toEqual({
                linked: true,
            });
        });

        it('deve aguardar a conclusão do Use Case', async () => {
            let resolveAssociation: (() => void) | undefined;

            const pendingAssociation = new Promise<void>((resolve) => {
                resolveAssociation = resolve;
            });

            addChallengeMock.mockReturnValue(pendingAssociation);

            let completed = false;

            const operation = controller
                .addChallenge(PROJECT_ID, CHALLENGE_ID)
                .then((result) => {
                    completed = true;
                    return result;
                });

            await Promise.resolve();

            expect(completed).toBe(false);
            expect(addChallengeMock).toHaveBeenCalledTimes(1);

            if (!resolveAssociation) {
                throw new Error('Associação não inicializada.');
            }

            resolveAssociation();

            await expect(operation).resolves.toEqual({
                linked: true,
            });

            expect(completed).toBe(true);
        });

        it('deve utilizar os identificadores recebidos', async () => {
            const result = await controller.addChallenge(
                'project-2',
                'challenge-2',
            );

            expect(addChallengeMock).toHaveBeenCalledWith(
                'project-2',
                'challenge-2',
            );

            expect(result.linked).toBe(true);
        });

        it('deve encaminhar identificadores vazios para validação do Use Case', async () => {
            await controller.addChallenge('', '');

            expect(addChallengeMock).toHaveBeenCalledWith('', '');
        });

        it('deve propagar BadRequestException', async () => {
            const error = new BadRequestException(
                'Informe o projeto e o desafio.',
            );

            addChallengeMock.mockRejectedValue(error);

            await expect(
                controller.addChallenge('', CHALLENGE_ID),
            ).rejects.toBe(error);
        });

        it('deve propagar NotFoundException para projeto inexistente', async () => {
            const error = new NotFoundException(
                'Projeto não encontrado ou inativo.',
            );

            addChallengeMock.mockRejectedValue(error);

            await expect(
                controller.addChallenge('inexistente', CHALLENGE_ID),
            ).rejects.toBe(error);
        });

        it('deve propagar NotFoundException para desafio inexistente', async () => {
            const error = new NotFoundException(
                'Desafio não encontrado ou inativo.',
            );

            addChallengeMock.mockRejectedValue(error);

            await expect(
                controller.addChallenge(PROJECT_ID, 'inexistente'),
            ).rejects.toBe(error);
        });

        it('não deve retornar sucesso quando a associação falhar', async () => {
            const error = new Error('Falha ao associar desafio.');

            addChallengeMock.mockRejectedValue(error);

            await expect(
                controller.addChallenge(PROJECT_ID, CHALLENGE_ID),
            ).rejects.toBe(error);

            expect(addChallengeMock).toHaveBeenCalledTimes(1);
        });
    });
});
