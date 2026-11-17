import type { TChallenge } from '../challenge.entities';
import {
    ChallengeGateway,
    type TGetChallengeByContext,
} from '../challenge.gateway';

describe('ChallengeGateway', () => {
    const CHALLENGE_IRI = 'https://gamapi.dev/challenges/ux';
    const PROJECT_IRI = 'https://gamapi.dev/projects/ux';
    const APPLICATION_IRI = 'https://gamapi.dev/applications/teste';

    const challenge: TChallenge = {
        id: 'challenge-1',
        name: 'Desafio de UX',
        iri: CHALLENGE_IRI,
        points: 40,
        active: true,
    };

    const validContext: TGetChallengeByContext = {
        challengeIri: CHALLENGE_IRI,
        projectIri: PROJECT_IRI,
        applicationIri: APPLICATION_IRI,
    };

    class InMemoryChallengeGateway extends ChallengeGateway {
        private readonly records: {
            context: TGetChallengeByContext;
            challenge: TChallenge;
        }[] = [];

        add(
            context: TGetChallengeByContext,
            registeredChallenge: TChallenge,
        ): void {
            this.records.push({
                context,
                challenge: registeredChallenge,
            });
        }

        getByContext(
            params: TGetChallengeByContext,
        ): Promise<TChallenge | null> {
            const record = this.records.find(
                ({ context }) =>
                    context.challengeIri === params.challengeIri &&
                    context.projectIri === params.projectIri &&
                    context.applicationIri === params.applicationIri,
            );

            return Promise.resolve(record?.challenge ?? null);
        }
    }

    let gateway: InMemoryChallengeGateway;

    beforeEach(() => {
        gateway = new InMemoryChallengeGateway();
    });

    it('deve permitir implementar o contrato abstrato', () => {
        expect(gateway).toBeInstanceOf(ChallengeGateway);
        expect(gateway).toHaveProperty('getByContext', expect.any(Function));
    });

    it('deve retornar null quando não existe desafio cadastrado', async () => {
        const result = await gateway.getByContext(validContext);

        expect(result).toBeNull();
    });

    it('deve retornar um desafio pelo contexto completo', async () => {
        gateway.add(validContext, challenge);

        const result = await gateway.getByContext(validContext);

        expect(result).toEqual(challenge);
    });

    it('deve retornar null quando a IRI do desafio é diferente', async () => {
        gateway.add(validContext, challenge);

        const result = await gateway.getByContext({
            ...validContext,
            challengeIri: 'https://gamapi.dev/challenges/outro',
        });

        expect(result).toBeNull();
    });

    it('deve retornar null quando o projeto é diferente', async () => {
        gateway.add(validContext, challenge);

        const result = await gateway.getByContext({
            ...validContext,
            projectIri: 'https://gamapi.dev/projects/outro',
        });

        expect(result).toBeNull();
    });

    it('deve retornar null quando a aplicação é diferente', async () => {
        gateway.add(validContext, challenge);

        const result = await gateway.getByContext({
            ...validContext,
            applicationIri: 'https://gamapi.dev/applications/outra',
        });

        expect(result).toBeNull();
    });

    it('deve preservar os dados de um desafio inativo', async () => {
        const inactiveChallenge: TChallenge = {
            ...challenge,
            active: false,
        };

        gateway.add(validContext, inactiveChallenge);

        const result = await gateway.getByContext(validContext);

        expect(result).toEqual(inactiveChallenge);
        expect(result?.active).toBe(false);
    });

    it('deve retornar um desafio com zero pontos', async () => {
        const zeroPointsChallenge: TChallenge = {
            ...challenge,
            points: 0,
        };

        gateway.add(validContext, zeroPointsChallenge);

        const result = await gateway.getByContext(validContext);

        expect(result?.points).toBe(0);
    });

    it('deve diferenciar desafios com contextos distintos', async () => {
        const secondContext: TGetChallengeByContext = {
            ...validContext,
            projectIri: 'https://gamapi.dev/projects/avancado',
        };

        const secondChallenge: TChallenge = {
            ...challenge,
            id: 'challenge-2',
            points: 100,
        };

        gateway.add(validContext, challenge);
        gateway.add(secondContext, secondChallenge);

        expect(await gateway.getByContext(validContext)).toEqual(challenge);

        expect(await gateway.getByContext(secondContext)).toEqual(
            secondChallenge,
        );
    });
});
