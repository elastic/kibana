export interface TaskState {
    searchAfter?: string;
    deleteTaskId?: string;
    [key: string]: unknown;
}
export interface SpaceSloSettings {
    spaceId: string;
    staleThresholdInHours: number;
}
export interface QueryContainer {
    bool: {
        should: Array<{
            bool: {
                filter: Array<{
                    terms?: {
                        spaceId: string[];
                    };
                    range?: {
                        summaryUpdatedAt: {
                            lt: string;
                        };
                    };
                }>;
            };
        }>;
        minimum_should_match: number;
    };
}
