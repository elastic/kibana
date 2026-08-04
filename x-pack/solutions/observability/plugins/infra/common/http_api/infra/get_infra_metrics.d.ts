import * as rt from 'io-ts';
export declare const InfraMetricTypeRT: rt.KeyofC<{
    cpu: null;
    cpuV2: null;
    normalizedLoad1m: null;
    diskSpaceUsage: null;
    memory: null;
    memoryFree: null;
    rx: null;
    tx: null;
    rxV2: null;
    txV2: null;
}>;
export declare const InfraEntityMetadataTypeRT: rt.KeyofC<{
    'cloud.provider': null;
    'host.ip': null;
    'host.os.name': null;
}>;
export declare const InfraEntityMetricsRT: rt.TypeC<{
    name: rt.KeyofC<{
        cpu: null;
        cpuV2: null;
        normalizedLoad1m: null;
        diskSpaceUsage: null;
        memory: null;
        memoryFree: null;
        rx: null;
        tx: null;
        rxV2: null;
        txV2: null;
    }>;
    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>;
export declare const InfraEntityMetadataRT: rt.TypeC<{
    name: rt.KeyofC<{
        'cloud.provider': null;
        'host.ip': null;
        'host.os.name': null;
    }>;
    value: rt.UnionC<[rt.NumberC, rt.StringC, rt.NullC]>;
}>;
export declare const GetInfraMetricsRequestBodyPayloadRT: rt.IntersectionC<[rt.PartialC<{
    query: rt.UnknownRecordC;
    schema: rt.KeyofC<{
        ecs: null;
        semconv: null;
    }>;
}>, rt.TypeC<{
    limit: rt.UnionC<[rt.Type<number, number, unknown>, rt.Type<500, undefined, unknown>]>;
    metrics: rt.ArrayC<rt.KeyofC<{
        cpu: null;
        cpuV2: null;
        normalizedLoad1m: null;
        diskSpaceUsage: null;
        memory: null;
        memoryFree: null;
        rx: null;
        tx: null;
        rxV2: null;
        txV2: null;
    }>>;
    from: rt.Type<number, string, unknown>;
    to: rt.Type<number, string, unknown>;
}>]>;
export declare const GetInfraMetricsRequestParamsRT: rt.TypeC<{
    entityType: rt.KeyofC<{
        host: null;
        pod: null;
    }>;
}>;
export declare const InfraEntityMetricsItemRT: rt.IntersectionC<[rt.TypeC<{
    name: rt.StringC;
    metrics: rt.ArrayC<rt.TypeC<{
        name: rt.KeyofC<{
            cpu: null;
            cpuV2: null;
            normalizedLoad1m: null;
            diskSpaceUsage: null;
            memory: null;
            memoryFree: null;
            rx: null;
            tx: null;
            rxV2: null;
            txV2: null;
        }>;
        value: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>;
    metadata: rt.ArrayC<rt.TypeC<{
        name: rt.KeyofC<{
            'cloud.provider': null;
            'host.ip': null;
            'host.os.name': null;
        }>;
        value: rt.UnionC<[rt.NumberC, rt.StringC, rt.NullC]>;
    }>>;
    hasSystemMetrics: rt.BooleanC;
}>, rt.PartialC<{
    alertsCount: rt.NumberC;
}>]>;
export declare const GetInfraMetricsResponsePayloadRT: rt.IntersectionC<[rt.TypeC<{
    entityType: rt.KeyofC<{
        host: null;
        pod: null;
    }>;
}>, rt.TypeC<{
    nodes: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
        name: rt.StringC;
        metrics: rt.ArrayC<rt.TypeC<{
            name: rt.KeyofC<{
                cpu: null;
                cpuV2: null;
                normalizedLoad1m: null;
                diskSpaceUsage: null;
                memory: null;
                memoryFree: null;
                rx: null;
                tx: null;
                rxV2: null;
                txV2: null;
            }>;
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>;
        metadata: rt.ArrayC<rt.TypeC<{
            name: rt.KeyofC<{
                'cloud.provider': null;
                'host.ip': null;
                'host.os.name': null;
            }>;
            value: rt.UnionC<[rt.NumberC, rt.StringC, rt.NullC]>;
        }>>;
        hasSystemMetrics: rt.BooleanC;
    }>, rt.PartialC<{
        alertsCount: rt.NumberC;
    }>]>>;
}>]>;
export type InfraEntityMetrics = rt.TypeOf<typeof InfraEntityMetricsRT>;
export type InfraEntityMetadata = rt.TypeOf<typeof InfraEntityMetadataRT>;
export type InfraEntityMetadataType = rt.TypeOf<typeof InfraEntityMetadataTypeRT>;
export type InfraEntityMetricType = rt.TypeOf<typeof InfraMetricTypeRT>;
export type InfraEntityMetricsItem = rt.TypeOf<typeof InfraEntityMetricsItemRT>;
export type GetInfraMetricsRequestBodyPayload = rt.TypeOf<typeof GetInfraMetricsRequestBodyPayloadRT>;
export type GetInfraMetricsRequestBodyPayloadClient = rt.OutputOf<typeof GetInfraMetricsRequestBodyPayloadRT>;
export type GetInfraMetricsResponsePayload = rt.TypeOf<typeof GetInfraMetricsResponsePayloadRT>;
