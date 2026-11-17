import {
    BadRequestException,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';

import type {
    TBadge,
    TBadgeProject,
    TCreateBadgeInput,
} from '../../domain/badge.entities';
import { BadgeGateway } from '../../domain/badge.gateway';
import { CreateBadgeUseCase } from '../create-badge.use.case';

describe('CreateBadgeUseCase', () => {
    let useCase: CreateBadgeUseCase;

    let gateway: {
        findProjectById: jest.Mock;
        findByIri: jest.Mock;
        createBadge: jest.Mock;
    };

    const PROJECT_ID = 'project-1';
    const BADGE_IRI = 'https://gamapi.dev/badges/ux-master';

    const activeProject: TBadgeProject = {
        id: PROJECT_ID,
        name: 'Projeto de UX',
        iri: 'https://gamapi.dev/projects/ux',
        active: true,
        applicationIri: 'https://gamapi.dev/applications/teste',
        applicationActive: true,
    };

    const createdBadge: TBadge = {
        id: 'badge-1',
        name: 'UX Master',
        description: 'Concluiu os requisitos de UX.',
        iri: BADGE_IRI,
        imageUrl: null,
        projectId: PROJECT_ID,
        ruleOperator: 'ALL',
        active: true,
        rules: [],
    };

    const createInput = (
        overrides: Partial<TCreateBadgeInput> = {},
    ): TCreateBadgeInput => ({
        name: 'UX Master',
        description: 'Concluiu os requisitos de UX.',
        iri: BADGE_IRI,
        projectId: PROJECT_ID,
        ...overrides,
    });

    beforeEach(() => {
        gateway = {
            findProjectById: jest.fn().mockResolvedValue(activeProject),
            findByIri: jest.fn().mockResolvedValue(null),
            createBadge: jest.fn().mockResolvedValue(createdBadge),
        };

        useCase = new CreateBadgeUseCase(gateway as unknown as BadgeGateway);
    });

    describe('Cadastro de insígnias', () => {
        it('deve cadastrar uma insígnia válida', async () => {
            const input = createInput();

            const result = await useCase.execute(input);

            expect(result).toEqual(createdBadge);

            expect(gateway.findProjectById).toHaveBeenCalledWith(PROJECT_ID);

            expect(gateway.findByIri).toHaveBeenCalledWith(BADGE_IRI);

            expect(gateway.createBadge).toHaveBeenCalledWith({
                name: input.name,
                description: input.description,
                iri: BADGE_IRI,
                projectId: PROJECT_ID,
                imageUrl: null,
                ruleOperator: 'ALL',
            });

            expect(gateway.createBadge).toHaveBeenCalledTimes(1);
        });

        it('deve remover espaços dos campos antes do cadastro', async () => {
            const input = createInput({
                name: '  UX Master  ',
                description: '  Concluiu os requisitos de UX.  ',
                iri: `  ${BADGE_IRI}  `,
                imageUrl: '  https://gamapi.dev/images/ux.png  ',
            });

            await useCase.execute(input);

            expect(gateway.findByIri).toHaveBeenCalledWith(BADGE_IRI);

            expect(gateway.createBadge).toHaveBeenCalledWith({
                name: 'UX Master',
                description: 'Concluiu os requisitos de UX.',
                iri: BADGE_IRI,
                projectId: PROJECT_ID,
                imageUrl: 'https://gamapi.dev/images/ux.png',
                ruleOperator: 'ALL',
            });
        });

        it('deve utilizar ALL como operador padrão', async () => {
            await useCase.execute(createInput());

            expect(gateway.createBadge).toHaveBeenCalledWith(
                expect.objectContaining({
                    ruleOperator: 'ALL',
                }),
            );
        });

        it('deve aceitar o operador ALL explicitamente', async () => {
            await useCase.execute(createInput({ ruleOperator: 'ALL' }));

            expect(gateway.createBadge).toHaveBeenCalledWith(
                expect.objectContaining({
                    ruleOperator: 'ALL',
                }),
            );
        });

        it('deve aceitar o operador ANY', async () => {
            await useCase.execute(createInput({ ruleOperator: 'ANY' }));

            expect(gateway.createBadge).toHaveBeenCalledWith(
                expect.objectContaining({
                    ruleOperator: 'ANY',
                }),
            );
        });

        it('deve preservar o ID do projeto informado', async () => {
            const projectId = 'outro-projeto';

            await useCase.execute(createInput({ projectId }));

            expect(gateway.findProjectById).toHaveBeenCalledWith(projectId);

            expect(gateway.createBadge).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectId,
                }),
            );
        });
    });

    describe('Validação dos dados obrigatórios', () => {
        it.each([null, undefined])(
            'deve rejeitar dados da insígnia ausentes: %p',
            async (invalidInput) => {
                await expect(
                    useCase.execute(
                        invalidInput as unknown as TCreateBadgeInput,
                    ),
                ).rejects.toThrow('Dados da insígnia inválidos.');

                expect(gateway.findProjectById).not.toHaveBeenCalled();
                expect(gateway.createBadge).not.toHaveBeenCalled();
            },
        );

        it.each(['name', 'description', 'iri', 'projectId'] as const)(
            'deve rejeitar %s quando não for string',
            async (field) => {
                const invalidInput = {
                    ...createInput(),
                    [field]: 123,
                };

                await expect(useCase.execute(invalidInput)).rejects.toThrow(
                    BadRequestException,
                );

                expect(gateway.findProjectById).not.toHaveBeenCalled();
            },
        );

        it.each(['name', 'description', 'iri', 'projectId'] as const)(
            'deve rejeitar %s quando estiver ausente',
            async (field) => {
                const invalidInput = {
                    ...createInput(),
                    [field]: undefined,
                };

                await expect(useCase.execute(invalidInput)).rejects.toThrow(
                    'Dados da insígnia inválidos.',
                );

                expect(gateway.createBadge).not.toHaveBeenCalled();
            },
        );

        it.each(['name', 'description', 'iri', 'projectId'] as const)(
            'deve rejeitar %s quando estiver vazio',
            async (field) => {
                const invalidInput = createInput({
                    [field]: '',
                });

                await expect(useCase.execute(invalidInput)).rejects.toThrow(
                    'Preencha os campos obrigatórios.',
                );

                expect(gateway.createBadge).not.toHaveBeenCalled();
            },
        );

        it.each(['name', 'description', 'iri', 'projectId'] as const)(
            'deve rejeitar %s contendo apenas espaços',
            async (field) => {
                const invalidInput = createInput({
                    [field]: '   ',
                });

                await expect(useCase.execute(invalidInput)).rejects.toThrow(
                    'Preencha os campos obrigatórios.',
                );

                expect(gateway.createBadge).not.toHaveBeenCalled();
            },
        );
    });

    describe('Validação da imagem', () => {
        it('deve aceitar uma URL de imagem válida', async () => {
            const imageUrl = 'https://gamapi.dev/images/badge.png';

            await useCase.execute(createInput({ imageUrl }));

            expect(gateway.createBadge).toHaveBeenCalledWith(
                expect.objectContaining({
                    imageUrl,
                }),
            );
        });

        it('deve aceitar imageUrl não informado', async () => {
            await useCase.execute(createInput());

            expect(gateway.createBadge).toHaveBeenCalledWith(
                expect.objectContaining({
                    imageUrl: null,
                }),
            );
        });

        it('deve aceitar imageUrl igual a null', async () => {
            await useCase.execute(createInput({ imageUrl: null }));

            expect(gateway.createBadge).toHaveBeenCalledWith(
                expect.objectContaining({
                    imageUrl: null,
                }),
            );
        });

        it('deve converter imageUrl vazio para null', async () => {
            await useCase.execute(createInput({ imageUrl: '' }));

            expect(gateway.createBadge).toHaveBeenCalledWith(
                expect.objectContaining({
                    imageUrl: null,
                }),
            );
        });

        it('deve converter imageUrl somente com espaços para null', async () => {
            await useCase.execute(createInput({ imageUrl: '   ' }));

            expect(gateway.createBadge).toHaveBeenCalledWith(
                expect.objectContaining({
                    imageUrl: null,
                }),
            );
        });

        it.each([123, false, {}, []])(
            'deve rejeitar imageUrl com tipo inválido: %p',
            async (invalidImageUrl) => {
                const invalidInput = {
                    ...createInput(),
                    imageUrl: invalidImageUrl,
                } as unknown as TCreateBadgeInput;

                await expect(useCase.execute(invalidInput)).rejects.toThrow(
                    'URL da imagem inválida.',
                );

                expect(gateway.createBadge).not.toHaveBeenCalled();
            },
        );
    });

    describe('Validação do operador de regras', () => {
        it('deve rejeitar operador desconhecido', async () => {
            const invalidInput = {
                ...createInput(),
                ruleOperator: 'INVALID',
            } as unknown as TCreateBadgeInput;

            await expect(useCase.execute(invalidInput)).rejects.toThrow(
                'Operador de regras inválido.',
            );

            expect(gateway.findProjectById).not.toHaveBeenCalled();
        });

        it('deve rejeitar operador igual a null', async () => {
            const invalidInput = {
                ...createInput(),
                ruleOperator: null,
            } as unknown as TCreateBadgeInput;

            await expect(useCase.execute(invalidInput)).rejects.toThrow(
                BadRequestException,
            );

            expect(gateway.createBadge).not.toHaveBeenCalled();
        });

        it('deve rejeitar operador com tipo numérico', async () => {
            const invalidInput = {
                ...createInput(),
                ruleOperator: 1,
            } as unknown as TCreateBadgeInput;

            await expect(useCase.execute(invalidInput)).rejects.toThrow(
                'Operador de regras inválido.',
            );

            expect(gateway.createBadge).not.toHaveBeenCalled();
        });
    });

    describe('Validação da IRI', () => {
        it.each(['iri-invalida', 'https://', 'gamapi.dev/badges/ux-master'])(
            'deve rejeitar IRI inválida: %s',
            async (invalidIri) => {
                await expect(
                    useCase.execute(createInput({ iri: invalidIri })),
                ).rejects.toThrow('IRI da insígnia inválida.');

                expect(gateway.findProjectById).not.toHaveBeenCalled();
                expect(gateway.createBadge).not.toHaveBeenCalled();
            },
        );

        it('deve aceitar IRI HTTPS válida', async () => {
            await useCase.execute(
                createInput({
                    iri: 'https://example.com/badges/primeira',
                }),
            );

            expect(gateway.findByIri).toHaveBeenCalledWith(
                'https://example.com/badges/primeira',
            );
        });
    });

    describe('Validação do projeto', () => {
        it('deve rejeitar projeto inexistente', async () => {
            gateway.findProjectById.mockResolvedValue(null);

            await expect(useCase.execute(createInput())).rejects.toThrow(
                NotFoundException,
            );

            expect(gateway.findByIri).not.toHaveBeenCalled();
            expect(gateway.createBadge).not.toHaveBeenCalled();
        });

        it('deve rejeitar projeto inativo', async () => {
            gateway.findProjectById.mockResolvedValue({
                ...activeProject,
                active: false,
            });

            await expect(useCase.execute(createInput())).rejects.toThrow(
                'Projeto não encontrado ou inativo.',
            );

            expect(gateway.findByIri).not.toHaveBeenCalled();
            expect(gateway.createBadge).not.toHaveBeenCalled();
        });

        it('deve rejeitar projeto cuja aplicação está inativa', async () => {
            gateway.findProjectById.mockResolvedValue({
                ...activeProject,
                applicationActive: false,
            });

            await expect(useCase.execute(createInput())).rejects.toThrow(
                'Projeto não encontrado ou inativo.',
            );

            expect(gateway.findByIri).not.toHaveBeenCalled();
            expect(gateway.createBadge).not.toHaveBeenCalled();
        });

        it('deve permitir cadastro quando projeto e aplicação estão ativos', async () => {
            const result = await useCase.execute(createInput());

            expect(result).toEqual(createdBadge);
            expect(gateway.createBadge).toHaveBeenCalledTimes(1);
        });
    });

    describe('Insígnia já cadastrada', () => {
        it('deve rejeitar IRI já utilizada por outra insígnia', async () => {
            gateway.findByIri.mockResolvedValue(createdBadge);

            await expect(useCase.execute(createInput())).rejects.toThrow(
                ConflictException,
            );

            expect(gateway.findByIri).toHaveBeenCalledWith(BADGE_IRI);

            expect(gateway.createBadge).not.toHaveBeenCalled();
        });

        it('deve consultar a IRI normalizada antes de verificar duplicidade', async () => {
            gateway.findByIri.mockResolvedValue(createdBadge);

            await expect(
                useCase.execute(
                    createInput({
                        iri: `   ${BADGE_IRI}   `,
                    }),
                ),
            ).rejects.toThrow('Insígnia já cadastrada.');

            expect(gateway.findByIri).toHaveBeenCalledWith(BADGE_IRI);

            expect(gateway.createBadge).not.toHaveBeenCalled();
        });
    });

    describe('Falhas do gateway', () => {
        it('deve propagar falha ao consultar o projeto', async () => {
            gateway.findProjectById.mockRejectedValue(
                new Error('Falha ao consultar projeto.'),
            );

            await expect(useCase.execute(createInput())).rejects.toThrow(
                'Falha ao consultar projeto.',
            );

            expect(gateway.findByIri).not.toHaveBeenCalled();
            expect(gateway.createBadge).not.toHaveBeenCalled();
        });

        it('deve propagar falha ao consultar insígnia por IRI', async () => {
            gateway.findByIri.mockRejectedValue(
                new Error('Falha ao consultar insígnia.'),
            );

            await expect(useCase.execute(createInput())).rejects.toThrow(
                'Falha ao consultar insígnia.',
            );

            expect(gateway.createBadge).not.toHaveBeenCalled();
        });

        it('deve propagar falha ao persistir a insígnia', async () => {
            gateway.createBadge.mockRejectedValue(
                new Error('Falha ao criar insígnia.'),
            );

            await expect(useCase.execute(createInput())).rejects.toThrow(
                'Falha ao criar insígnia.',
            );

            expect(gateway.createBadge).toHaveBeenCalledTimes(1);
        });
    });
});
