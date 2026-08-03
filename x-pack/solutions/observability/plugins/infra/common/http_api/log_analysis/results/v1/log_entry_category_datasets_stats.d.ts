import * as rt from 'io-ts';
export declare const LOG_ANALYSIS_GET_LATEST_LOG_ENTRY_CATEGORY_DATASETS_STATS_PATH = "/api/infra/log_analysis/results/latest_log_entry_category_datasets_stats";
declare const categorizerStatusRT: rt.KeyofC<{
    ok: null;
    warn: null;
}>;
export type CategorizerStatus = rt.TypeOf<typeof categorizerStatusRT>;
/**
 * request
 */
export declare const getLatestLogEntryCategoryDatasetsStatsRequestPayloadRT: rt.TypeC<{
    data: rt.TypeC<{
        jobIds: rt.ArrayC<rt.StringC>;
        timeRange: rt.TypeC<{
            startTime: rt.NumberC;
            endTime: rt.NumberC;
        }>;
        includeCategorizerStatuses: rt.ArrayC<rt.KeyofC<{
            ok: null;
            warn: null;
        }>>;
    }>;
}>;
export type GetLatestLogEntryCategoryDatasetsStatsRequestPayload = rt.TypeOf<typeof getLatestLogEntryCategoryDatasetsStatsRequestPayloadRT>;
/**
 * response
 */
declare const logEntryCategoriesDatasetStatsRT: rt.TypeC<{
    categorization_status: rt.KeyofC<{
        ok: null;
        warn: null;
    }>;
    categorized_doc_count: rt.NumberC;
    dataset: rt.StringC;
    dead_category_count: rt.NumberC;
    failed_category_count: rt.NumberC;
    frequent_category_count: rt.NumberC;
    job_id: rt.StringC;
    log_time: rt.NumberC;
    rare_category_count: rt.NumberC;
    total_category_count: rt.NumberC;
}>;
export type LogEntryCategoriesDatasetStats = rt.TypeOf<typeof logEntryCategoriesDatasetStatsRT>;
export declare const getLatestLogEntryCategoryDatasetsStatsSuccessResponsePayloadRT: rt.IntersectionC<[rt.TypeC<{
    data: rt.TypeC<{
        datasetStats: rt.ArrayC<rt.TypeC<{
            categorization_status: rt.KeyofC<{
                ok: null;
                warn: null;
            }>;
            categorized_doc_count: rt.NumberC;
            dataset: rt.StringC;
            dead_category_count: rt.NumberC;
            failed_category_count: rt.NumberC;
            frequent_category_count: rt.NumberC;
            job_id: rt.StringC;
            log_time: rt.NumberC;
            rare_category_count: rt.NumberC;
            total_category_count: rt.NumberC;
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
export type GetLatestLogEntryCategoryDatasetsStatsSuccessResponsePayload = rt.TypeOf<typeof getLatestLogEntryCategoryDatasetsStatsSuccessResponsePayloadRT>;
export {};
