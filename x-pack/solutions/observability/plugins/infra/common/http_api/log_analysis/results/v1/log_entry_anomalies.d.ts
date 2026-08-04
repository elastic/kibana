import * as rt from 'io-ts';
export declare const LOG_ANALYSIS_GET_LOG_ENTRY_ANOMALIES_PATH = "/api/infra/log_analysis/results/log_entry_anomalies";
export declare const getLogEntryAnomaliesSuccessReponsePayloadRT: rt.IntersectionC<[rt.TypeC<{
    data: rt.IntersectionC<[rt.TypeC<{
        anomalies: rt.ArrayC<rt.UnionC<[rt.TypeC<{
            id: rt.StringC;
            anomalyScore: rt.NumberC;
            dataset: rt.StringC;
            typical: rt.NumberC;
            actual: rt.NumberC;
            type: rt.KeyofC<{
                logRate: null;
                logCategory: null;
            }>;
            duration: rt.NumberC;
            startTime: rt.NumberC;
            jobId: rt.StringC;
        }>, rt.IntersectionC<[rt.TypeC<{
            id: rt.StringC;
            anomalyScore: rt.NumberC;
            dataset: rt.StringC;
            typical: rt.NumberC;
            actual: rt.NumberC;
            type: rt.KeyofC<{
                logRate: null;
                logCategory: null;
            }>;
            duration: rt.NumberC;
            startTime: rt.NumberC;
            jobId: rt.StringC;
        }>, rt.TypeC<{
            categoryId: rt.StringC;
            categoryRegex: rt.StringC;
            categoryTerms: rt.StringC;
        }>]>]>>;
        hasMoreEntries: rt.BooleanC;
    }>, rt.PartialC<{
        paginationCursors: rt.TypeC<{
            previousPageCursor: rt.TupleC<[rt.UnionC<[rt.StringC, rt.NumberC]>, rt.UnionC<[rt.StringC, rt.NumberC]>]>;
            nextPageCursor: rt.TupleC<[rt.UnionC<[rt.StringC, rt.NumberC]>, rt.UnionC<[rt.StringC, rt.NumberC]>]>;
        }>;
    }>]>;
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
export type GetLogEntryAnomaliesSuccessResponsePayload = rt.TypeOf<typeof getLogEntryAnomaliesSuccessReponsePayloadRT>;
export declare const getLogEntryAnomaliesRequestPayloadRT: rt.TypeC<{
    data: rt.IntersectionC<[rt.TypeC<{
        logView: rt.TypeC<{
            logViewId: rt.StringC;
            type: rt.LiteralC<"log-view-reference">;
        }>;
        idFormats: rt.RecordC<rt.UnionC<[rt.LiteralC<"log-entry-rate">, rt.LiteralC<"log-entry-categories-count">]>, rt.UnionC<[rt.LiteralC<"legacy">, rt.LiteralC<"hashed">]>>;
        timeRange: rt.TypeC<{
            startTime: rt.NumberC;
            endTime: rt.NumberC;
        }>;
    }>, rt.PartialC<{
        pagination: rt.IntersectionC<[rt.TypeC<{
            pageSize: rt.NumberC;
        }>, rt.PartialC<{
            cursor: rt.UnionC<[rt.TypeC<{
                searchBefore: rt.TupleC<[rt.UnionC<[rt.StringC, rt.NumberC]>, rt.UnionC<[rt.StringC, rt.NumberC]>]>;
            }>, rt.TypeC<{
                searchAfter: rt.TupleC<[rt.UnionC<[rt.StringC, rt.NumberC]>, rt.UnionC<[rt.StringC, rt.NumberC]>]>;
            }>]>;
        }>]>;
        sort: rt.TypeC<{
            field: rt.KeyofC<{
                anomalyScore: null;
                dataset: null;
                startTime: null;
            }>;
            direction: rt.KeyofC<{
                asc: null;
                desc: null;
            }>;
        }>;
        datasets: rt.ArrayC<rt.StringC>;
    }>]>;
}>;
export type GetLogEntryAnomaliesRequestPayload = rt.TypeOf<typeof getLogEntryAnomaliesRequestPayloadRT>;
