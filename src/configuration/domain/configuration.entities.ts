export type TApplication = {
    id: string;
    name: string;
    iri: string;
    active: boolean;
};

export type TProject = {
    id: string;
    name: string;
    iri: string;
    applicationId: string;
    active: boolean;
};

export type TCreateApplication = {
    name: string;
    iri: string;
};

export type TCreateProject = {
    name: string;
    iri: string;
    applicationId: string;
};
