import * as rt from 'io-ts';
export declare const GetInfraEntityCountRequestBodyPayloadRT: rt.IntersectionC<[rt.PartialC<{
    query: rt.UnknownRecordC;
    schema: rt.KeyofC<{
        ecs: null;
        semconv: null;
    }>;
}>, rt.TypeC<{
    from: rt.Type<number, string, unknown>;
    to: rt.Type<number, string, unknown>;
}>]>;
export declare const GetInfraEntityCountRequestParamsPayloadRT: rt.TypeC<{
    entityType: rt.KeyofC<{
        host: null;
        pod: null;
    }>;
}>;
export declare const GetInfraEntityCountResponsePayloadRT: rt.IntersectionC<[rt.TypeC<{
    entityType: rt.KeyofC<{
        host: null;
        pod: null;
    }>;
}>, rt.TypeC<{
    count: rt.NumberC;
}>]>;
export type GetInfraEntityCountRequestParamsPayload = rt.TypeOf<typeof GetInfraEntityCountRequestParamsPayloadRT>;
export type GetInfraEntityCountRequestBodyPayload = rt.TypeOf<typeof GetInfraEntityCountRequestBodyPayloadRT>;
export type GetInfraEntityCountRequestBodyPayloadClient = rt.OutputOf<typeof GetInfraEntityCountRequestBodyPayloadRT>;
export type GetInfraEntityCountResponsePayload = rt.TypeOf<typeof GetInfraEntityCountResponsePayloadRT>;
