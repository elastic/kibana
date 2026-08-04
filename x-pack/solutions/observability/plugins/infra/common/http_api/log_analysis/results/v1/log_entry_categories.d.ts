import * as rt from 'io-ts';
export declare const LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORIES_PATH = "/api/infra/log_analysis/results/log_entry_categories";
/**
 * request
 */
declare const logEntryCategoriesHistogramParametersRT: rt.TypeC<{
    id: rt.StringC;
    timeRange: rt.TypeC<{
        startTime: rt.NumberC;
        endTime: rt.NumberC;
    }>;
    bucketCount: rt.NumberC;
}>;
export type LogEntryCategoriesHistogramParameters = rt.TypeOf<typeof logEntryCategoriesHistogramParametersRT>;
export declare const getLogEntryCategoriesRequestPayloadRT: rt.TypeC<{
    data: rt.IntersectionC<[rt.TypeC<{
        categoryCount: rt.NumberC;
        logView: rt.TypeC<{
            logViewId: rt.StringC;
            type: rt.LiteralC<"log-view-reference">;
        }>;
        idFormat: rt.UnionC<[rt.LiteralC<"legacy">, rt.LiteralC<"hashed">]>;
        timeRange: rt.TypeC<{
            startTime: rt.NumberC;
            endTime: rt.NumberC;
        }>;
        histograms: rt.ArrayC<rt.TypeC<{
            id: rt.StringC;
            timeRange: rt.TypeC<{
                startTime: rt.NumberC;
                endTime: rt.NumberC;
            }>;
            bucketCount: rt.NumberC;
        }>>;
        sort: rt.TypeC<{
            field: rt.KeyofC<{
                maximumAnomalyScore: null;
                logEntryCount: null;
            }>;
            direction: rt.KeyofC<{
                asc: null;
                desc: null;
            }>;
        }>;
    }>, rt.PartialC<{
        datasets: rt.ArrayC<rt.StringC>;
    }>]>;
}>;
export type GetLogEntryCategoriesRequestPayload = rt.TypeOf<typeof getLogEntryCategoriesRequestPayloadRT>;
/**
 * response
 */
export declare const getLogEntryCategoriesSuccessReponsePayloadRT: rt.IntersectionC<[rt.TypeC<{
    data: rt.TypeC<{
        categories: rt.ArrayC<rt.TypeC<{
            categoryId: rt.NumberC;
            datasets: rt.ArrayC<rt.TypeC<{
                name: rt.StringC;
                maximumAnomalyScore: rt.NumberC;
            }>>;
            histograms: rt.ArrayC<rt.TypeC<{
                histogramId: rt.StringC;
                buckets: rt.ArrayC<rt.TypeC<{
                    startTime: rt.NumberC;
                    bucketDuration: rt.NumberC;
                    logEntryCount: rt.NumberC;
                }>>;
            }>>;
            logEntryCount: rt.NumberC;
            maximumAnomalyScore: rt.NumberC;
            regularExpression: rt.StringC;
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
export type GetLogEntryCategoriesSuccessResponsePayload = rt.TypeOf<typeof getLogEntryCategoriesSuccessReponsePayloadRT>;
export declare const getLogEntryCategoriesResponsePayloadRT: rt.UnionC<[rt.IntersectionC<[rt.TypeC<{
    data: rt.TypeC<{
        categories: rt.ArrayC<rt.TypeC<{
            categoryId: rt.NumberC;
            datasets: rt.ArrayC<rt.TypeC<{
                name: rt.StringC;
                maximumAnomalyScore: rt.NumberC;
            }>>;
            histograms: rt.ArrayC<rt.TypeC<{
                histogramId: rt.StringC;
                buckets: rt.ArrayC<rt.TypeC<{
                    startTime: rt.NumberC;
                    bucketDuration: rt.NumberC;
                    logEntryCount: rt.NumberC;
                }>>;
            }>>;
            logEntryCount: rt.NumberC;
            maximumAnomalyScore: rt.NumberC;
            regularExpression: rt.StringC;
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
export type GetLogEntryCategoriesReponsePayload = rt.TypeOf<typeof getLogEntryCategoriesResponsePayloadRT>;
export {};
