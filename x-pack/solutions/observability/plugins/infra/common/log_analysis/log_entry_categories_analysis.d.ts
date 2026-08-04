import * as rt from 'io-ts';
export declare const logEntryCategoriesJobTypeRT: rt.LiteralC<"log-entry-categories-count">;
export type LogEntryCategoriesJobType = rt.TypeOf<typeof logEntryCategoriesJobTypeRT>;
export declare const logEntryCategoriesJobTypes: LogEntryCategoriesJobType[];
export declare const logEntryCategoriesJobType: LogEntryCategoriesJobType;
export declare const logEntryCategoryDatasetRT: rt.TypeC<{
    name: rt.StringC;
    maximumAnomalyScore: rt.NumberC;
}>;
export type LogEntryCategoryDataset = rt.TypeOf<typeof logEntryCategoryDatasetRT>;
export declare const logEntryCategoryHistogramBucketRT: rt.TypeC<{
    startTime: rt.NumberC;
    bucketDuration: rt.NumberC;
    logEntryCount: rt.NumberC;
}>;
export type LogEntryCategoryHistogramBucket = rt.TypeOf<typeof logEntryCategoryHistogramBucketRT>;
export declare const logEntryCategoryHistogramRT: rt.TypeC<{
    histogramId: rt.StringC;
    buckets: rt.ArrayC<rt.TypeC<{
        startTime: rt.NumberC;
        bucketDuration: rt.NumberC;
        logEntryCount: rt.NumberC;
    }>>;
}>;
export type LogEntryCategoryHistogram = rt.TypeOf<typeof logEntryCategoryHistogramRT>;
export declare const logEntryCategoryRT: rt.TypeC<{
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
}>;
export type LogEntryCategory = rt.TypeOf<typeof logEntryCategoryRT>;
export declare const categoriesSortRT: rt.TypeC<{
    field: rt.KeyofC<{
        maximumAnomalyScore: null;
        logEntryCount: null;
    }>;
    direction: rt.KeyofC<{
        asc: null;
        desc: null;
    }>;
}>;
export type CategoriesSort = rt.TypeOf<typeof categoriesSortRT>;
