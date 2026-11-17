import type {
    TChallenge,
    TCreateChallenge,
} from '../../../challenges/domain/challenge.entities';

import type {
    TApplication,
    TCreateApplication,
    TCreateProject,
    TProject,
} from '../configuration.entities';

import { ConfigurationGateway } from '../configuration.gateway';

describe('ConfigurationGateway', () => {
    const application: TApplication = {
        id: 'application-1',
        name: 'Aplicação Educacional',
        iri: 'https://gamapi.dev/applications/educacional',
        active: true,
    };

    const project: TProject = {
        id: 'project-1',
        name: 'Projeto UX',
        iri: 'https://gamapi.dev/projects/ux',
        applicationId: application.id,
        active: true,
    };

    const challenge: TChallenge = {
        id: 'challenge-1',
        name: 'Desafio de UX',
        iri: 'https://gamapi.dev/challenges/ux',
        points: 40,
        active: true,
    };

    class MockConfigurationGateway extends ConfigurationGateway {
        findApplicationById = jest.fn(
            (id: string): Promise<TApplication | null> => {
                void id;
                return Promise.resolve(null);
            },
        );

        findApplicationByIri = jest.fn(
            (iri: string): Promise<TApplication | null> => {
                void iri;
                return Promise.resolve(null);
            },
        );

        findProjectById = jest.fn((id: string): Promise<TProject | null> => {
            void id;
            return Promise.resolve(null);
        });

        findProjectByIri = jest.fn((iri: string): Promise<TProject | null> => {
            void iri;
            return Promise.resolve(null);
        });

        findChallengeById = jest.fn(
            (id: string): Promise<TChallenge | null> => {
                void id;
                return Promise.resolve(null);
            },
        );

        findChallengeByIri = jest.fn(
            (iri: string): Promise<TChallenge | null> => {
                void iri;
                return Promise.resolve(null);
            },
        );

        createApplication = jest.fn(
            (params: TCreateApplication): Promise<TApplication> =>
                Promise.resolve({
                    id: 'application-created',
                    ...params,
                    active: true,
                }),
        );

        createProject = jest.fn((params: TCreateProject): Promise<TProject> =>
            Promise.resolve({
                id: 'project-created',
                ...params,
                active: true,
            }),
        );

        createChallenge = jest.fn(
            (params: TCreateChallenge): Promise<TChallenge> =>
                Promise.resolve({
                    id: 'challenge-created',
                    ...params,
                    active: true,
                }),
        );

        addChallengeToProject = jest.fn(
            (projectId: string, challengeId: string): Promise<void> => {
                void projectId;
                void challengeId;
                return Promise.resolve();
            },
        );

        updateChallengePoints = jest.fn(
            (id: string, points: number): Promise<TChallenge> =>
                Promise.resolve({
                    ...challenge,
                    id,
                    points,
                }),
        );
    }

    let gateway: MockConfigurationGateway;

    beforeEach(() => {
        gateway = new MockConfigurationGateway();
    });

    describe('Contrato abstrato', () => {
        it('deve permitir criar uma implementação concreta', () => {
            expect(gateway).toBeInstanceOf(ConfigurationGateway);
        });

        it('deve disponibilizar todos os métodos do contrato', () => {
            expect(typeof gateway.findApplicationById).toBe('function');
            expect(typeof gateway.findApplicationByIri).toBe('function');
            expect(typeof gateway.findProjectById).toBe('function');
            expect(typeof gateway.findProjectByIri).toBe('function');
            expect(typeof gateway.findChallengeById).toBe('function');
            expect(typeof gateway.findChallengeByIri).toBe('function');
            expect(typeof gateway.createApplication).toBe('function');
            expect(typeof gateway.createProject).toBe('function');
            expect(typeof gateway.createChallenge).toBe('function');
            expect(typeof gateway.addChallengeToProject).toBe('function');
            expect(typeof gateway.updateChallengePoints).toBe('function');
        });
    });

    describe('Consulta de aplicações', () => {
        it('deve permitir consultar uma aplicação pelo ID', async () => {
            gateway.findApplicationById.mockResolvedValue(application);

            const result = await gateway.findApplicationById(application.id);

            expect(result).toEqual(application);
            expect(gateway.findApplicationById).toHaveBeenCalledWith(
                application.id,
            );
        });

        it('deve permitir consultar uma aplicação pela IRI', async () => {
            gateway.findApplicationByIri.mockResolvedValue(application);

            const result = await gateway.findApplicationByIri(application.iri);

            expect(result).toEqual(application);
            expect(gateway.findApplicationByIri).toHaveBeenCalledWith(
                application.iri,
            );
        });

        it('deve permitir retornar null para aplicação inexistente', async () => {
            expect(await gateway.findApplicationById('inexistente')).toBeNull();

            expect(
                await gateway.findApplicationByIri('iri-inexistente'),
            ).toBeNull();
        });
    });

    describe('Consulta de projetos', () => {
        it('deve permitir consultar um projeto pelo ID', async () => {
            gateway.findProjectById.mockResolvedValue(project);

            const result = await gateway.findProjectById(project.id);

            expect(result).toEqual(project);
            expect(gateway.findProjectById).toHaveBeenCalledWith(project.id);
        });

        it('deve permitir consultar um projeto pela IRI', async () => {
            gateway.findProjectByIri.mockResolvedValue(project);

            const result = await gateway.findProjectByIri(project.iri);

            expect(result).toEqual(project);
            expect(gateway.findProjectByIri).toHaveBeenCalledWith(project.iri);
        });

        it('deve permitir retornar null para projeto inexistente', async () => {
            expect(await gateway.findProjectById('inexistente')).toBeNull();

            expect(
                await gateway.findProjectByIri('iri-inexistente'),
            ).toBeNull();
        });
    });

    describe('Consulta de desafios', () => {
        it('deve permitir consultar um desafio pelo ID', async () => {
            gateway.findChallengeById.mockResolvedValue(challenge);

            const result = await gateway.findChallengeById(challenge.id);

            expect(result).toEqual(challenge);
            expect(gateway.findChallengeById).toHaveBeenCalledWith(
                challenge.id,
            );
        });

        it('deve permitir consultar um desafio pela IRI', async () => {
            gateway.findChallengeByIri.mockResolvedValue(challenge);

            const result = await gateway.findChallengeByIri(challenge.iri);

            expect(result).toEqual(challenge);
            expect(gateway.findChallengeByIri).toHaveBeenCalledWith(
                challenge.iri,
            );
        });

        it('deve permitir retornar null para desafio inexistente', async () => {
            expect(await gateway.findChallengeById('inexistente')).toBeNull();

            expect(
                await gateway.findChallengeByIri('iri-inexistente'),
            ).toBeNull();
        });

        it('deve preservar o estado inativo de um desafio', async () => {
            const inactiveChallenge: TChallenge = {
                ...challenge,
                active: false,
            };

            gateway.findChallengeById.mockResolvedValue(inactiveChallenge);

            const result = await gateway.findChallengeById(challenge.id);

            expect(result?.active).toBe(false);
        });
    });

    describe('Criação de aplicações', () => {
        it('deve permitir criar uma aplicação', async () => {
            const input: TCreateApplication = {
                name: 'Nova Aplicação',
                iri: 'https://gamapi.dev/applications/nova',
            };

            const result = await gateway.createApplication(input);

            expect(result).toEqual({
                id: 'application-created',
                ...input,
                active: true,
            });

            expect(gateway.createApplication).toHaveBeenCalledWith(input);
        });
    });

    describe('Criação de projetos', () => {
        it('deve permitir criar um projeto associado à aplicação', async () => {
            const input: TCreateProject = {
                name: 'Novo Projeto',
                iri: 'https://gamapi.dev/projects/novo',
                applicationId: application.id,
            };

            const result = await gateway.createProject(input);

            expect(result).toEqual({
                id: 'project-created',
                ...input,
                active: true,
            });

            expect(gateway.createProject).toHaveBeenCalledWith(input);
        });
    });

    describe('Criação de desafios', () => {
        it('deve permitir criar um desafio', async () => {
            const input: TCreateChallenge = {
                name: 'Novo Desafio',
                iri: 'https://gamapi.dev/challenges/novo',
                points: 100,
            };

            const result = await gateway.createChallenge(input);

            expect(result).toEqual({
                id: 'challenge-created',
                ...input,
                active: true,
            });

            expect(gateway.createChallenge).toHaveBeenCalledWith(input);
        });

        it('deve permitir criar um desafio com zero pontos', async () => {
            const result = await gateway.createChallenge({
                name: 'Desafio Inicial',
                iri: 'https://gamapi.dev/challenges/inicial',
                points: 0,
            });

            expect(result.points).toBe(0);
        });
    });

    describe('Associação de desafios', () => {
        it('deve permitir associar um desafio ao projeto', async () => {
            await expect(
                gateway.addChallengeToProject(project.id, challenge.id),
            ).resolves.toBeUndefined();

            expect(gateway.addChallengeToProject).toHaveBeenCalledTimes(1);

            expect(gateway.addChallengeToProject).toHaveBeenCalledWith(
                project.id,
                challenge.id,
            );
        });
    });

    describe('Atualização da pontuação', () => {
        it('deve permitir atualizar a pontuação de um desafio', async () => {
            const result = await gateway.updateChallengePoints(
                challenge.id,
                100,
            );

            expect(result).toEqual({
                ...challenge,
                points: 100,
            });

            expect(gateway.updateChallengePoints).toHaveBeenCalledWith(
                challenge.id,
                100,
            );
        });

        it('deve permitir atualizar a pontuação para zero', async () => {
            const result = await gateway.updateChallengePoints(challenge.id, 0);

            expect(result.points).toBe(0);
        });

        it('deve preservar o identificador informado', async () => {
            const result = await gateway.updateChallengePoints(
                'challenge-2',
                80,
            );

            expect(result.id).toBe('challenge-2');
            expect(result.points).toBe(80);
        });
    });
});
