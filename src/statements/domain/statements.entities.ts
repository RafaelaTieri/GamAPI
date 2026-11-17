export type TXApiLanguageMap = Record<string, string>;

export type TXApiActivity = {
    objectType?: 'Activity';
    id: string;
    definition?: {
        type?: string;
        name?: TXApiLanguageMap;
        description?: TXApiLanguageMap;
    };
};

export type TXApiStatementRef = {
    objectType: 'StatementRef';
    id: string;
};

export type TXApiStatement = {
    id: string;

    actor: {
        name?: string;
        mbox: string;
    };

    verb: {
        id: string;
        display?: TXApiLanguageMap;
    };

    object: TXApiActivity;

    context?: {
        statement?: TXApiStatementRef;
        contextActivities?: {
            grouping?: TXApiActivity[];
        };
    };

    result?: {
        extensions?: Record<string, number | string | boolean>;
    };

    timestamp?: string;
};

export type TXApiStatementResult = {
    statements: TXApiStatement[];
    more?: string;
};
