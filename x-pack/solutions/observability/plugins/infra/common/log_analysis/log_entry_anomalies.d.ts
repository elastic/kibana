import * as rt from 'io-ts';
export declare const anomalyTypeRT: rt.KeyofC<{
    logRate: null;
    logCategory: null;
}>;
export type AnomalyType = rt.TypeOf<typeof anomalyTypeRT>;
export declare const logEntryAnomalyCommonFieldsRT: rt.TypeC<{
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
}>;
export declare const logEntrylogRateAnomalyRT: rt.TypeC<{
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
}>;
export type RateAnomaly = rt.TypeOf<typeof logEntrylogRateAnomalyRT>;
export declare const logEntrylogCategoryAnomalyRT: rt.IntersectionC<[rt.TypeC<{
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
}>]>;
export type CategoryAnomaly = rt.TypeOf<typeof logEntrylogCategoryAnomalyRT>;
export declare const logEntryAnomalyRT: rt.UnionC<[rt.TypeC<{
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
}>]>]>;
export type LogEntryAnomaly = rt.TypeOf<typeof logEntryAnomalyRT>;
export declare const logEntryAnomalyDatasetsRT: rt.ArrayC<rt.StringC>;
export type LogEntryAnomalyDatasets = rt.TypeOf<typeof logEntryAnomalyDatasetsRT>;
export declare const isCategoryAnomaly: (anomaly: LogEntryAnomaly) => anomaly is CategoryAnomaly;
export declare const anomaliesSortRT: rt.TypeC<{
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
export type AnomaliesSort = rt.TypeOf<typeof anomaliesSortRT>;
