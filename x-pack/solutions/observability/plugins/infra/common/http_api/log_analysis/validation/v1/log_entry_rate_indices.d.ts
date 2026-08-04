import * as rt from 'io-ts';
export declare const LOG_ANALYSIS_VALIDATE_INDICES_PATH = "/api/infra/log_analysis/validation/log_entry_rate_indices";
/**
 * Request types
 */
export declare const validationIndicesFieldSpecificationRT: rt.TypeC<{
    name: rt.StringC;
    validTypes: rt.ArrayC<rt.StringC>;
}>;
export type ValidationIndicesFieldSpecification = rt.TypeOf<typeof validationIndicesFieldSpecificationRT>;
export declare const validationIndicesRequestPayloadRT: rt.TypeC<{
    data: rt.TypeC<{
        fields: rt.Type<{
            name: string;
            validTypes: string[];
        }[], {
            name: string;
            validTypes: string[];
        }[], unknown>;
        indices: rt.Type<string[], string[], unknown>;
        runtimeMappings: rt.RecordC<rt.StringC, rt.IntersectionC<[rt.PartialC<{
            format: rt.StringC;
            script: rt.UnionC<[rt.IntersectionC<[rt.PartialC<{
                params: rt.RecordC<rt.StringC, rt.AnyC>;
            }>, rt.PartialC<{
                lang: rt.StringC;
                options: rt.RecordC<rt.StringC, rt.StringC>;
            }>, rt.TypeC<{
                source: rt.StringC;
            }>]>, rt.StringC, rt.IntersectionC<[rt.PartialC<{
                params: rt.RecordC<rt.StringC, rt.AnyC>;
            }>, rt.TypeC<{
                id: rt.StringC;
            }>]>]>;
        }>, rt.TypeC<{
            type: rt.KeyofC<{
                boolean: null;
                date: null;
                double: null;
                geo_point: null;
                ip: null;
                keyword: null;
                long: null;
            }>;
        }>]>>;
    }>;
}>;
export type ValidationIndicesRequestPayload = rt.TypeOf<typeof validationIndicesRequestPayloadRT>;
/**
 * Response types
 * */
export declare const validationIndicesErrorRT: rt.UnionC<[rt.TypeC<{
    error: rt.LiteralC<"INDEX_NOT_FOUND">;
    index: rt.StringC;
}>, rt.TypeC<{
    error: rt.LiteralC<"FIELD_NOT_FOUND">;
    index: rt.StringC;
    field: rt.StringC;
}>, rt.TypeC<{
    error: rt.LiteralC<"FIELD_NOT_VALID">;
    index: rt.StringC;
    field: rt.StringC;
}>]>;
export type ValidationIndicesError = rt.TypeOf<typeof validationIndicesErrorRT>;
export declare const validationIndicesResponsePayloadRT: rt.TypeC<{
    data: rt.TypeC<{
        errors: rt.ArrayC<rt.UnionC<[rt.TypeC<{
            error: rt.LiteralC<"INDEX_NOT_FOUND">;
            index: rt.StringC;
        }>, rt.TypeC<{
            error: rt.LiteralC<"FIELD_NOT_FOUND">;
            index: rt.StringC;
            field: rt.StringC;
        }>, rt.TypeC<{
            error: rt.LiteralC<"FIELD_NOT_VALID">;
            index: rt.StringC;
            field: rt.StringC;
        }>]>>;
    }>;
}>;
export type ValidationIndicesResponsePayload = rt.TypeOf<typeof validationIndicesResponsePayloadRT>;
