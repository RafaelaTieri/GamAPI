import type {
    TLeaderboardEntry,
    TProjectLeaderboard,
} from '../leaderboard.entities';

describe('Tipos do leaderboard', () => {
    it('representa uma posição de participante', () => {
        const entry: TLeaderboardEntry = {
            position: 1,
            name: 'Ana',
            mbox: 'mailto:ana@email.com',
            points: 80,
        };

        expect(entry).toEqual({
            position: 1,
            name: 'Ana',
            mbox: 'mailto:ana@email.com',
            points: 80,
        });
    });

    it('representa uma classificação de projeto vazia', () => {
        const leaderboard: TProjectLeaderboard = {
            projectId: 'project-1',
            projectName: 'Projeto UX',
            leaderboard: [],
        };

        expect(leaderboard.leaderboard).toEqual([]);
    });

    it('representa uma classificação com múltiplos participantes', () => {
        const leaderboard: TProjectLeaderboard = {
            projectId: 'project-1',
            projectName: 'Projeto UX',
            leaderboard: [
                {
                    position: 1,
                    name: 'Ana',
                    mbox: 'mailto:ana@email.com',
                    points: 100,
                },
                {
                    position: 2,
                    name: 'Bia',
                    mbox: 'mailto:bia@email.com',
                    points: 50,
                },
            ],
        };

        expect(leaderboard.leaderboard).toHaveLength(2);
        expect(leaderboard.leaderboard[0].points).toBe(100);
        expect(leaderboard.leaderboard[1].position).toBe(2);
    });
});
