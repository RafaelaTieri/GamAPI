import type {
    TApplication,
    TProject,
    TCreateApplication,
    TCreateProject,
} from '../configuration.entities';

describe('Configuration Entities', () => {
    const createApplication = (
        overrides: Partial<TApplication> = {},
    ): TApplication => ({
        id: 'application-1',
        name: 'Aplicação Educacional',
        iri: 'https://gamapi.dev/applications/educacional',
        active: true,
        ...overrides,
    });

    const createProject = (overrides: Partial<TProject> = {}): TProject => ({
        id: 'project-1',
        name: 'Projeto UX',
        iri: 'https://gamapi.dev/projects/ux',
        applicationId: 'application-1',
        active: true,
        ...overrides,
    });

    describe('TApplication', () => {
        it('deve representar uma aplicação ativa', () => {
            const application: TApplication = createApplication();

            expect(application).toEqual({
                id: 'application-1',
                name: 'Aplicação Educacional',
                iri: 'https://gamapi.dev/applications/educacional',
                active: true,
            });
        });

        it('deve representar uma aplicação inativa', () => {
            const application = createApplication({
                active: false,
            });

            expect(application.active).toBe(false);
        });

        it('deve preservar o identificador da aplicação', () => {
            const application = createApplication({
                id: 'application-2',
            });

            expect(application.id).toBe('application-2');
        });

        it('deve preservar o nome da aplicação', () => {
            const application = createApplication({
                name: 'Aplicação de Matemática',
            });

            expect(application.name).toBe('Aplicação de Matemática');
        });

        it('deve preservar a IRI da aplicação', () => {
            const application = createApplication({
                iri: 'https://gamapi.dev/applications/matematica',
            });

            expect(application.iri).toBe(
                'https://gamapi.dev/applications/matematica',
            );
        });
    });

    describe('TProject', () => {
        it('deve representar um projeto ativo', () => {
            const project: TProject = createProject();

            expect(project).toEqual({
                id: 'project-1',
                name: 'Projeto UX',
                iri: 'https://gamapi.dev/projects/ux',
                applicationId: 'application-1',
                active: true,
            });
        });

        it('deve representar um projeto inativo', () => {
            const project = createProject({
                active: false,
            });

            expect(project.active).toBe(false);
        });

        it('deve preservar a associação com a aplicação', () => {
            const project = createProject({
                applicationId: 'application-2',
            });

            expect(project.applicationId).toBe('application-2');
        });

        it('deve permitir projetos diferentes na mesma aplicação', () => {
            const firstProject = createProject();

            const secondProject = createProject({
                id: 'project-2',
                name: 'Projeto Matemática',
                iri: 'https://gamapi.dev/projects/matematica',
            });

            expect(firstProject.applicationId).toBe(
                secondProject.applicationId,
            );

            expect(firstProject.id).not.toBe(secondProject.id);
            expect(firstProject.iri).not.toBe(secondProject.iri);
        });

        it('deve preservar os dados de um projeto', () => {
            const project = createProject({
                id: 'project-3',
                name: 'Projeto Avançado',
                iri: 'https://gamapi.dev/projects/avancado',
                applicationId: 'application-3',
            });

            expect(project).toMatchObject({
                id: 'project-3',
                name: 'Projeto Avançado',
                iri: 'https://gamapi.dev/projects/avancado',
                applicationId: 'application-3',
            });
        });
    });

    describe('TCreateApplication', () => {
        it('deve representar os dados de criação de aplicação', () => {
            const input: TCreateApplication = {
                name: 'Aplicação Educacional',
                iri: 'https://gamapi.dev/applications/educacional',
            };

            expect(input).toEqual({
                name: 'Aplicação Educacional',
                iri: 'https://gamapi.dev/applications/educacional',
            });
        });

        it('deve permitir dados de criação diferentes', () => {
            const input: TCreateApplication = {
                name: 'Aplicação de Matemática',
                iri: 'https://gamapi.dev/applications/matematica',
            };

            expect(input.name).toBe('Aplicação de Matemática');
            expect(input.iri).toBe(
                'https://gamapi.dev/applications/matematica',
            );
        });

        it('deve manter apenas os campos definidos na criação', () => {
            const input: TCreateApplication = {
                name: 'Nova Aplicação',
                iri: 'https://gamapi.dev/applications/nova',
            };

            expect(Object.keys(input)).toEqual(['name', 'iri']);
        });
    });

    describe('TCreateProject', () => {
        it('deve representar os dados de criação de projeto', () => {
            const input: TCreateProject = {
                name: 'Projeto UX',
                iri: 'https://gamapi.dev/projects/ux',
                applicationId: 'application-1',
            };

            expect(input).toEqual({
                name: 'Projeto UX',
                iri: 'https://gamapi.dev/projects/ux',
                applicationId: 'application-1',
            });
        });

        it('deve exigir a associação com uma aplicação no contrato', () => {
            const input: TCreateProject = {
                name: 'Projeto Matemática',
                iri: 'https://gamapi.dev/projects/matematica',
                applicationId: 'application-2',
            };

            expect(input.applicationId).toBe('application-2');
        });

        it('deve permitir criar vários projetos para a mesma aplicação', () => {
            const firstInput: TCreateProject = {
                name: 'Projeto UX',
                iri: 'https://gamapi.dev/projects/ux',
                applicationId: 'application-1',
            };

            const secondInput: TCreateProject = {
                name: 'Projeto Avançado',
                iri: 'https://gamapi.dev/projects/avancado',
                applicationId: 'application-1',
            };

            expect(firstInput.applicationId).toBe(secondInput.applicationId);

            expect(firstInput.iri).not.toBe(secondInput.iri);
        });

        it('deve preservar os dados enviados para criação', () => {
            const input: TCreateProject = {
                name: 'Projeto de Testes',
                iri: 'https://gamapi.dev/projects/testes',
                applicationId: 'application-3',
            };

            expect(Object.keys(input)).toEqual([
                'name',
                'iri',
                'applicationId',
            ]);
        });
    });
});
