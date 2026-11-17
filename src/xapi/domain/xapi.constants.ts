export const XAPI_VERBS = {
    COMPLETED: 'http://adlnet.gov/expapi/verbs/completed',
    EARNED_POINTS: 'https://gamapi.dev/verbs/earned-points',
    EARNED_BADGE: 'https://gamapi.dev/verbs/earned-badge',
} as const;

export const XAPI_ACTIVITY_TYPES = {
    CHALLENGE: 'https://gamapi.dev/activity-types/challenge',
    EDUCATIONAL_APPLICATION:
        'https://gamapi.dev/activity-types/educational-application',
    PROJECT: 'https://gamapi.dev/activity-types/project',
    POINTS: 'https://gamapi.dev/activity-types/points',
    BADGE: 'https://gamapi.dev/activity-types/badge',
} as const;

export const XAPI_EXTENSIONS = {
    POINTS: 'https://gamapi.dev/extensions/points',
} as const;
