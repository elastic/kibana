import * as rt from 'io-ts';
export declare const LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORY_DATASETS_PATH = "/api/infra/log_analysis/results/log_entry_category_datasets";
/**
 * request
 */
export declare const getLogEntryCategoryDatasetsRequestPayloadRT: rt.TypeC<{
    data: rt.TypeC<{
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
export type GetLogEntryCategoryDatasetsRequestPayload = rt.TypeOf<typeof getLogEntryCategoryDatasetsRequestPayloadRT>;
/**
 * response
 */
export declare const getLogEntryCategoryDatasetsSuccessReponsePayloadRT: rt.IntersectionC<[rt.TypeC<{
    data: rt.TypeC<{
        datasets: rt.ArrayC<rt.StringC>;
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
export type GetLogEntryCategoryDatasetsSuccessResponsePayload = rt.TypeOf<typeof getLogEntryCategoryDatasetsSuccessReponsePayloadRT>;
export declare const getLogEntryCategoryDatasetsResponsePayloadRT: rt.UnionC<[rt.IntersectionC<[rt.TypeC<{
    data: rt.TypeC<{
        datasets: rt.ArrayC<rt.StringC>;
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
export type GetLogEntryCategoryDatasetsReponsePayload = rt.TypeOf<typeof getLogEntryCategoryDatasetsResponsePayloadRT>;
