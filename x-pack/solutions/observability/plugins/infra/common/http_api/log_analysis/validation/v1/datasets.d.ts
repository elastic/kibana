import * as rt from 'io-ts';
export declare const LOG_ANALYSIS_VALIDATE_DATASETS_PATH = "/api/infra/log_analysis/validation/log_entry_datasets";
/**
 * Request types
 */
export declare const validateLogEntryDatasetsRequestPayloadRT: rt.TypeC<{
    data: rt.TypeC<{
        indices: rt.Type<string[], string[], unknown>;
        timestampField: rt.StringC;
        startTime: rt.NumberC;
        endTime: rt.NumberC;
        runtimeMappings: rt.UnknownRecordC;
    }>;
}>;
export type ValidateLogEntryDatasetsRequestPayload = rt.TypeOf<typeof validateLogEntryDatasetsRequestPayloadRT>;
export declare const validateLogEntryDatasetsResponsePayloadRT: rt.TypeC<{
    data: rt.TypeC<{
        datasets: rt.ArrayC<rt.ExactC<rt.TypeC<{
            indexName: rt.StringC;
            datasets: rt.ArrayC<rt.StringC>;
        }>>>;
    }>;
}>;
export type ValidateLogEntryDatasetsResponsePayload = rt.TypeOf<typeof validateLogEntryDatasetsResponsePayloadRT>;
