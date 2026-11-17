export type TLeaderboardEntry = {
    position: number;
    name: string;
    mbox: string;
    points: number;
};

export type TProjectLeaderboard = {
    projectId: string;
    projectName: string;
    leaderboard: TLeaderboardEntry[];
};
