export type TChallenge = {
    id: string;
    name: string;
    iri: string;
    points: number;
    active: boolean;
};

export type TCreateChallenge = {
    name: string;
    iri: string;
    points: number;
};
