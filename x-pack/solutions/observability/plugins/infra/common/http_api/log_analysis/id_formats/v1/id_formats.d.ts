import * as rt from 'io-ts';
export declare const idFormatRT: rt.UnionC<[rt.LiteralC<"legacy">, rt.LiteralC<"hashed">]>;
export type IdFormat = rt.TypeOf<typeof idFormatRT>;
declare const jobTypeRT: rt.UnionC<[rt.LiteralC<"log-entry-rate">, rt.LiteralC<"log-entry-categories-count">]>;
export type JobType = rt.TypeOf<typeof jobTypeRT>;
export declare const idFormatByJobTypeRT: rt.RecordC<rt.UnionC<[rt.LiteralC<"log-entry-rate">, rt.LiteralC<"log-entry-categories-count">]>, rt.UnionC<[rt.LiteralC<"legacy">, rt.LiteralC<"hashed">]>>;
export type IdFormatByJobType = rt.TypeOf<typeof idFormatByJobTypeRT>;
export declare const LOG_ANALYSIS_GET_ID_FORMATS = "/api/infra/log_analysis/id_formats";
export declare const getLogAnalysisIdFormatsRequestPayloadRT: rt.TypeC<{
    data: rt.TypeC<{
        logViewId: rt.StringC;
        spaceId: rt.StringC;
    }>;
}>;
export type GetLogAnalysisIdFormatsRequestPayload = rt.TypeOf<typeof getLogAnalysisIdFormatsRequestPayloadRT>;
export declare const getLogAnalysisIdFormatsSuccessResponsePayloadRT: rt.TypeC<{
    data: rt.RecordC<rt.UnionC<[rt.LiteralC<"log-entry-rate">, rt.LiteralC<"log-entry-categories-count">]>, rt.UnionC<[rt.LiteralC<"legacy">, rt.LiteralC<"hashed">]>>;
}>;
export type GetLogAnalysisIdFormatsSuccessResponsePayload = rt.TypeOf<typeof getLogAnalysisIdFormatsSuccessResponsePayloadRT>;
export {};
