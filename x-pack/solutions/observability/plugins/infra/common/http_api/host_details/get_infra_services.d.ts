import * as rt from 'io-ts';
export declare const sizeRT: rt.UnionC<[rt.Type<number, number, unknown>, rt.Type<10, undefined, unknown>]>;
export declare const servicesFiltersRT: rt.ExactC<rt.TypeC<{
    "host.name": rt.StringC;
}>>;
export type ServicesFilter = rt.TypeOf<typeof servicesFiltersRT>;
export declare const GetServicesRequestQueryRT: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    from: rt.Type<number, string, unknown>;
    to: rt.Type<number, string, unknown>;
    filters: rt.StringC;
}>>, rt.PartialC<{
    size: rt.UnionC<[rt.Type<number, number, unknown>, rt.Type<10, undefined, unknown>]>;
    validatedFilters: rt.ExactC<rt.TypeC<{
        "host.name": rt.StringC;
    }>>;
}>]>;
export type GetServicesRequestQuery = rt.TypeOf<typeof GetServicesRequestQueryRT>;
export interface ServicesAPIRequest {
    filters: ServicesFilter;
    from: number;
    to: number;
    size?: number;
}
export declare const ServicesAPIQueryAggregationRT: rt.TypeC<{
    services: rt.TypeC<{
        buckets: rt.ArrayC<rt.TypeC<{
            key: rt.StringC;
            latestAgent: rt.TypeC<{
                top: rt.ArrayC<rt.TypeC<{
                    sort: rt.ArrayC<rt.StringC>;
                    metrics: rt.TypeC<{
                        'agent.name': rt.UnionC<[rt.StringC, rt.NullC]>;
                    }>;
                }>>;
            }>;
        }>>;
    }>;
}>;
export type ServicesAPIQueryAggregation = rt.TypeOf<typeof ServicesAPIQueryAggregationRT>;
export declare const ServiceRT: rt.TypeC<{
    serviceName: rt.StringC;
    agentName: rt.UnionC<[rt.StringC, rt.NullC]>;
}>;
export type Service = rt.TypeOf<typeof ServiceRT>;
export declare const ServicesAPIResponseRT: rt.TypeC<{
    services: rt.ArrayC<rt.TypeC<{
        serviceName: rt.StringC;
        agentName: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>;
}>;
export type ServicesAPIResponse = rt.TypeOf<typeof ServicesAPIResponseRT>;
