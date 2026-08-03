import * as rt from 'io-ts';
export declare const LOG_ANALYSIS_GET_LOG_ENTRY_RATE_EXAMPLES_PATH = "/api/infra/log_analysis/results/log_entry_examples";
/**
 * request
 */
export declare const getLogEntryExamplesRequestPayloadRT: rt.TypeC<{
    data: rt.IntersectionC<[rt.TypeC<{
        dataset: rt.StringC;
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
    }>, rt.PartialC<{
        categoryId: rt.StringC;
    }>]>;
}>;
export type GetLogEntryExamplesRequestPayload = rt.TypeOf<typeof getLogEntryExamplesRequestPayloadRT>;
/**
 * response
 */
export declare const getLogEntryExamplesSuccessResponsePayloadRT: rt.IntersectionC<[rt.TypeC<{
    data: rt.TypeC<{
        examples: rt.ArrayC<rt.TypeC<{
            id: rt.StringC;
            dataset: rt.StringC;
            message: rt.StringC;
            timestamp: rt.NumberC;
            tiebreaker: rt.NumberC;
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
export type GetLogEntryExamplesSuccessReponsePayload = rt.TypeOf<typeof getLogEntryExamplesSuccessResponsePayloadRT>;
export declare const getLogEntryExamplesResponsePayloadRT: rt.UnionC<[rt.IntersectionC<[rt.TypeC<{
    data: rt.TypeC<{
        examples: rt.ArrayC<rt.TypeC<{
            id: rt.StringC;
            dataset: rt.StringC;
            message: rt.StringC;
            timestamp: rt.NumberC;
            tiebreaker: rt.NumberC;
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
export type GetLogEntryExamplesResponsePayload = rt.TypeOf<typeof getLogEntryExamplesResponsePayloadRT>;
