import * as rt from 'io-ts';
export declare const LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORY_EXAMPLES_PATH = "/api/infra/log_analysis/results/log_entry_category_examples";
/**
 * request
 */
export declare const getLogEntryCategoryExamplesRequestPayloadRT: rt.TypeC<{
    data: rt.TypeC<{
        categoryId: rt.NumberC;
        exampleCount: rt.NumberC;
        logView: rt.TypeC<{
            logViewId: rt.StringC;
            type: rt.LiteralC<"log-view-reference">;
        }>;
        idFormat: rt.UnionC<[rt.LiteralC<"legacy">, rt.LiteralC<"hashed">]>;
        timeRange: rt.TypeC<{
            startTime: rt.NumberC;
            endTime: rt.NumberC;
        }>;
    }>;
}>;
export type GetLogEntryCategoryExamplesRequestPayload = rt.TypeOf<typeof getLogEntryCategoryExamplesRequestPayloadRT>;
/**
 * response
 */
declare const logEntryCategoryExampleRT: rt.TypeC<{
    id: rt.StringC;
    dataset: rt.StringC;
    message: rt.StringC;
    timestamp: rt.NumberC;
    tiebreaker: rt.NumberC;
    context: rt.UnionC<[rt.TypeC<{}>, rt.TypeC<{
        'container.id': rt.StringC;
    }>, rt.TypeC<{
        'host.name': rt.StringC;
        'log.file.path': rt.StringC;
    }>]>;
}>;
export type LogEntryCategoryExample = rt.TypeOf<typeof logEntryCategoryExampleRT>;
export declare const getLogEntryCategoryExamplesSuccessReponsePayloadRT: rt.IntersectionC<[rt.TypeC<{
    data: rt.TypeC<{
        examples: rt.ArrayC<rt.TypeC<{
            id: rt.StringC;
            dataset: rt.StringC;
            message: rt.StringC;
            timestamp: rt.NumberC;
            tiebreaker: rt.NumberC;
            context: rt.UnionC<[rt.TypeC<{}>, rt.TypeC<{
                'container.id': rt.StringC;
            }>, rt.TypeC<{
                'host.name': rt.StringC;
                'log.file.path': rt.StringC;
            }>]>;
        }>>;
    }>;
}>, rt.PartialC<{
    timing: rt.TypeC<{
        spans: rt.ArrayC<rt.TypeC<{
            duration: rt.NumberC;
            id: rt.StringC;
            name: rt.StringC;
            start: rt.NumberC;
        }>>;
    }>;
}>]>;
export type GetLogEntryCategoryExamplesSuccessResponsePayload = rt.TypeOf<typeof getLogEntryCategoryExamplesSuccessReponsePayloadRT>;
export declare const getLogEntryCategoryExamplesResponsePayloadRT: rt.UnionC<[rt.IntersectionC<[rt.TypeC<{
    data: rt.TypeC<{
        examples: rt.ArrayC<rt.TypeC<{
            id: rt.StringC;
            dataset: rt.StringC;
            message: rt.StringC;
            timestamp: rt.NumberC;
            tiebreaker: rt.NumberC;
            context: rt.UnionC<[rt.TypeC<{}>, rt.TypeC<{
                'container.id': rt.StringC;
            }>, rt.TypeC<{
                'host.name': rt.StringC;
                'log.file.path': rt.StringC;
            }>]>;
        }>>;
    }>;
}>, rt.PartialC<{
    timing: rt.TypeC<{
        spans: rt.ArrayC<rt.TypeC<{
            duration: rt.NumberC;
            id: rt.StringC;
            name: rt.StringC;
            start: rt.NumberC;
        }>>;
    }>;
}>]>, rt.IntersectionC<[rt.TypeC<{
    statusCode: rt.LiteralC<400>;
    error: rt.LiteralC<"Bad Request">;
    message: rt.StringC;
}>, rt.PartialC<{
    attributes: rt.UnknownC;
}>]>, rt.IntersectionC<[rt.TypeC<{
    statusCode: rt.LiteralC<403>;
    error: rt.LiteralC<"Forbidden">;
    message: rt.StringC;
}>, rt.PartialC<{
    attributes: rt.UnknownC;
}>]>]>;
export type GetLogEntryCategoryExamplesReponsePayload = rt.TypeOf<typeof getLogEntryCategoryExamplesResponsePayloadRT>;
export {};
