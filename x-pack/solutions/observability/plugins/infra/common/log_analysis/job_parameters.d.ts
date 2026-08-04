import * as rt from 'io-ts';
import type { IdFormat, JobType } from '../http_api/latest';
export declare const bucketSpan = 900000;
export declare const categoriesMessageField = "message";
export declare const partitionField = "event.dataset";
export declare const getJobIdPrefix: (spaceId: string, sourceId: string, idFormat: IdFormat) => string;
export declare const getJobId: (spaceId: string, logViewId: string, idFormat: IdFormat, jobType: JobType) => string;
export declare const getDatafeedId: (spaceId: string, logViewId: string, idFormat: IdFormat, jobType: JobType) => string;
export declare const datasetFilterRT: rt.UnionC<[rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"includeAll">;
}>>, rt.ExactC<rt.TypeC<{
    type: rt.LiteralC<"includeSome">;
    datasets: rt.ArrayC<rt.StringC>;
}>>]>;
export type DatasetFilter = rt.TypeOf<typeof datasetFilterRT>;
export declare const jobSourceConfigurationRT: rt.PartialC<{
    indexPattern: rt.StringC;
    timestampField: rt.StringC;
    bucketSpan: rt.NumberC;
    datasetFilter: rt.UnionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<"includeAll">;
    }>>, rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<"includeSome">;
        datasets: rt.ArrayC<rt.StringC>;
    }>>]>;
}>;
export type JobSourceConfiguration = rt.TypeOf<typeof jobSourceConfigurationRT>;
export declare const jobCustomSettingsRT: rt.PartialC<{
    job_revision: rt.NumberC;
    logs_source_config: rt.PartialC<{
        indexPattern: rt.StringC;
        timestampField: rt.StringC;
        bucketSpan: rt.NumberC;
        datasetFilter: rt.UnionC<[rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<"includeAll">;
        }>>, rt.ExactC<rt.TypeC<{
            type: rt.LiteralC<"includeSome">;
            datasets: rt.ArrayC<rt.StringC>;
        }>>]>;
    }>;
}>;
export type JobCustomSettings = rt.TypeOf<typeof jobCustomSettingsRT>;
export declare const combineDatasetFilters: (firstFilter: DatasetFilter, secondFilter: DatasetFilter) => DatasetFilter;
export declare const filterDatasetFilter: (datasetFilter: DatasetFilter, predicate: (dataset: string) => boolean) => DatasetFilter;
