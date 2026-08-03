import * as rt from 'io-ts';
import type { estypes } from '@elastic/elasticsearch';
import type { LensConfig } from '@kbn/lens-embeddable-utils';
import type { AggregationConfigMap, ChartsConfigMap, DataSchemaFormat, FormulasConfigMap, InventoryMetricsConfig } from './shared/metrics/types';
import type { HOST_METRICS_RECEIVER_OTEL, KUBELET_STATS_RECEIVER_OTEL, SYSTEM_INTEGRATION } from '../constants';
export { DataSchemaFormatEnum, type DataSchemaFormat } from './shared/metrics/types';
export declare const ItemTypeRT: rt.KeyofC<{
    host: null;
    pod: null;
    container: null;
    awsEC2: null;
    awsS3: null;
    awsSQS: null;
    awsRDS: null;
}>;
export declare const InventoryVisTypeRT: rt.KeyofC<{
    line: null;
    area: null;
    bar: null;
}>;
export type InventoryVisType = rt.TypeOf<typeof InventoryVisTypeRT>;
export declare const InventoryFormatterTypeRT: rt.KeyofC<{
    abbreviatedNumber: null;
    bits: null;
    bytes: null;
    number: null;
    percent: null;
    highPrecision: null;
}>;
export type InventoryFormatterType = rt.TypeOf<typeof InventoryFormatterTypeRT>;
export type InventoryItemType = rt.TypeOf<typeof ItemTypeRT>;
export declare const InventoryTsvbTypeKeysRT: rt.KeyofC<{
    podOverview: null;
    podCpuUsage: null;
    podMemoryUsage: null;
    podLogUsage: null;
    podNetworkTraffic: null;
    nginxHits: null;
    nginxRequestRate: null;
    nginxActiveConnections: null;
    nginxRequestsPerConnection: null;
    awsOverview: null;
    awsCpuUtilization: null;
    awsNetworkBytes: null;
    awsNetworkPackets: null;
    awsDiskioBytes: null;
    awsDiskioOps: null;
    awsEC2CpuUtilization: null;
    awsEC2NetworkTraffic: null;
    awsEC2DiskIOBytes: null;
    awsS3TotalRequests: null;
    awsS3NumberOfObjects: null;
    awsS3BucketSize: null;
    awsS3DownloadBytes: null;
    awsS3UploadBytes: null;
    awsRDSCpuTotal: null;
    awsRDSConnections: null;
    awsRDSQueriesExecuted: null;
    awsRDSActiveTransactions: null;
    awsRDSLatency: null;
    awsSQSMessagesVisible: null;
    awsSQSMessagesDelayed: null;
    awsSQSMessagesSent: null;
    awsSQSMessagesEmpty: null;
    awsSQSOldestMessage: null;
    custom: null;
}>;
export type InventoryTsvbType = rt.TypeOf<typeof InventoryTsvbTypeKeysRT>;
export declare const TSVBMetricTypeRT: rt.KeyofC<{
    avg: null;
    max: null;
    min: null;
    calculation: null;
    cardinality: null;
    series_agg: null;
    positive_only: null;
    derivative: null;
    count: null;
    sum: null;
    cumulative_sum: null;
}>;
export type TSVBMetricType = rt.TypeOf<typeof TSVBMetricTypeRT>;
export declare const TSVBMetricModelCountRT: rt.TypeC<{
    id: rt.StringC;
    type: rt.LiteralC<"count">;
}>;
export declare const TSVBMetricModelBasicMetricRT: rt.IntersectionC<[rt.TypeC<{
    id: rt.StringC;
    type: rt.KeyofC<{
        avg: null;
        max: null;
        min: null;
        calculation: null;
        cardinality: null;
        series_agg: null;
        positive_only: null;
        derivative: null;
        count: null;
        sum: null;
        cumulative_sum: null;
    }>;
}>, rt.PartialC<{
    field: rt.StringC;
}>]>;
export declare const TSVBMetricModelVariableRT: rt.TypeC<{
    field: rt.StringC;
    id: rt.StringC;
    name: rt.StringC;
}>;
export declare const TSVBMetricModelBucketScriptRT: rt.IntersectionC<[rt.TypeC<{
    id: rt.StringC;
    script: rt.StringC;
    type: rt.LiteralC<"calculation">;
    variables: rt.ArrayC<rt.TypeC<{
        field: rt.StringC;
        id: rt.StringC;
        name: rt.StringC;
    }>>;
}>, rt.PartialC<{
    gap_policy: rt.UnionC<[rt.LiteralC<"skip">, rt.LiteralC<"insert_zeros">, rt.LiteralC<"keep_values">]>;
}>]>;
export declare const TSVBMetricModelDerivativeRT: rt.TypeC<{
    id: rt.StringC;
    field: rt.StringC;
    unit: rt.StringC;
    type: rt.LiteralC<"derivative">;
}>;
export declare const TSVBMetricModelSeriesAggRT: rt.TypeC<{
    id: rt.StringC;
    function: rt.StringC;
    type: rt.LiteralC<"series_agg">;
}>;
export declare const TSVBPercentileItemRT: rt.TypeC<{
    id: rt.StringC;
    value: rt.NumberC;
}>;
export declare const TSVBMetricModePercentileAggRT: rt.IntersectionC<[rt.TypeC<{
    id: rt.StringC;
    type: rt.LiteralC<"percentile">;
    percentiles: rt.ArrayC<rt.TypeC<{
        id: rt.StringC;
        value: rt.NumberC;
    }>>;
}>, rt.PartialC<{
    field: rt.StringC;
}>]>;
export declare const TSVBMetricRT: rt.UnionC<[rt.TypeC<{
    id: rt.StringC;
    type: rt.LiteralC<"count">;
}>, rt.IntersectionC<[rt.TypeC<{
    id: rt.StringC;
    type: rt.KeyofC<{
        avg: null;
        max: null;
        min: null;
        calculation: null;
        cardinality: null;
        series_agg: null;
        positive_only: null;
        derivative: null;
        count: null;
        sum: null;
        cumulative_sum: null;
    }>;
}>, rt.PartialC<{
    field: rt.StringC;
}>]>, rt.IntersectionC<[rt.TypeC<{
    id: rt.StringC;
    script: rt.StringC;
    type: rt.LiteralC<"calculation">;
    variables: rt.ArrayC<rt.TypeC<{
        field: rt.StringC;
        id: rt.StringC;
        name: rt.StringC;
    }>>;
}>, rt.PartialC<{
    gap_policy: rt.UnionC<[rt.LiteralC<"skip">, rt.LiteralC<"insert_zeros">, rt.LiteralC<"keep_values">]>;
}>]>, rt.TypeC<{
    id: rt.StringC;
    field: rt.StringC;
    unit: rt.StringC;
    type: rt.LiteralC<"derivative">;
}>, rt.IntersectionC<[rt.TypeC<{
    id: rt.StringC;
    type: rt.LiteralC<"percentile">;
    percentiles: rt.ArrayC<rt.TypeC<{
        id: rt.StringC;
        value: rt.NumberC;
    }>>;
}>, rt.PartialC<{
    field: rt.StringC;
}>]>, rt.TypeC<{
    id: rt.StringC;
    function: rt.StringC;
    type: rt.LiteralC<"series_agg">;
}>]>;
export type TSVBMetric = rt.TypeOf<typeof TSVBMetricRT>;
export declare const TSVBSeriesRT: rt.IntersectionC<[rt.TypeC<{
    id: rt.StringC;
    metrics: rt.ArrayC<rt.UnionC<[rt.TypeC<{
        id: rt.StringC;
        type: rt.LiteralC<"count">;
    }>, rt.IntersectionC<[rt.TypeC<{
        id: rt.StringC;
        type: rt.KeyofC<{
            avg: null;
            max: null;
            min: null;
            calculation: null;
            cardinality: null;
            series_agg: null;
            positive_only: null;
            derivative: null;
            count: null;
            sum: null;
            cumulative_sum: null;
        }>;
    }>, rt.PartialC<{
        field: rt.StringC;
    }>]>, rt.IntersectionC<[rt.TypeC<{
        id: rt.StringC;
        script: rt.StringC;
        type: rt.LiteralC<"calculation">;
        variables: rt.ArrayC<rt.TypeC<{
            field: rt.StringC;
            id: rt.StringC;
            name: rt.StringC;
        }>>;
    }>, rt.PartialC<{
        gap_policy: rt.UnionC<[rt.LiteralC<"skip">, rt.LiteralC<"insert_zeros">, rt.LiteralC<"keep_values">]>;
    }>]>, rt.TypeC<{
        id: rt.StringC;
        field: rt.StringC;
        unit: rt.StringC;
        type: rt.LiteralC<"derivative">;
    }>, rt.IntersectionC<[rt.TypeC<{
        id: rt.StringC;
        type: rt.LiteralC<"percentile">;
        percentiles: rt.ArrayC<rt.TypeC<{
            id: rt.StringC;
            value: rt.NumberC;
        }>>;
    }>, rt.PartialC<{
        field: rt.StringC;
    }>]>, rt.TypeC<{
        id: rt.StringC;
        function: rt.StringC;
        type: rt.LiteralC<"series_agg">;
    }>]>>;
    split_mode: rt.StringC;
}>, rt.PartialC<{
    terms_field: rt.StringC;
    terms_size: rt.NumberC;
    terms_order_by: rt.StringC;
    filter: rt.TypeC<{
        query: rt.StringC;
        language: rt.KeyofC<{
            lucene: null;
            kuery: null;
        }>;
    }>;
}>]>;
export type TSVBSeries = rt.TypeOf<typeof TSVBSeriesRT>;
export declare const TSVBMetricModelRT: rt.IntersectionC<[rt.TypeC<{
    id: rt.KeyofC<{
        podOverview: null;
        podCpuUsage: null;
        podMemoryUsage: null;
        podLogUsage: null;
        podNetworkTraffic: null;
        nginxHits: null;
        nginxRequestRate: null;
        nginxActiveConnections: null;
        nginxRequestsPerConnection: null;
        awsOverview: null;
        awsCpuUtilization: null;
        awsNetworkBytes: null;
        awsNetworkPackets: null;
        awsDiskioBytes: null;
        awsDiskioOps: null;
        awsEC2CpuUtilization: null;
        awsEC2NetworkTraffic: null;
        awsEC2DiskIOBytes: null;
        awsS3TotalRequests: null;
        awsS3NumberOfObjects: null;
        awsS3BucketSize: null;
        awsS3DownloadBytes: null;
        awsS3UploadBytes: null;
        awsRDSCpuTotal: null;
        awsRDSConnections: null;
        awsRDSQueriesExecuted: null;
        awsRDSActiveTransactions: null;
        awsRDSLatency: null;
        awsSQSMessagesVisible: null;
        awsSQSMessagesDelayed: null;
        awsSQSMessagesSent: null;
        awsSQSMessagesEmpty: null;
        awsSQSOldestMessage: null;
        custom: null;
    }>;
    requires: rt.ArrayC<rt.StringC>;
    index_pattern: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
    interval: rt.StringC;
    time_field: rt.StringC;
    type: rt.StringC;
    series: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
        id: rt.StringC;
        metrics: rt.ArrayC<rt.UnionC<[rt.TypeC<{
            id: rt.StringC;
            type: rt.LiteralC<"count">;
        }>, rt.IntersectionC<[rt.TypeC<{
            id: rt.StringC;
            type: rt.KeyofC<{
                avg: null;
                max: null;
                min: null;
                calculation: null;
                cardinality: null;
                series_agg: null;
                positive_only: null;
                derivative: null;
                count: null;
                sum: null;
                cumulative_sum: null;
            }>;
        }>, rt.PartialC<{
            field: rt.StringC;
        }>]>, rt.IntersectionC<[rt.TypeC<{
            id: rt.StringC;
            script: rt.StringC;
            type: rt.LiteralC<"calculation">;
            variables: rt.ArrayC<rt.TypeC<{
                field: rt.StringC;
                id: rt.StringC;
                name: rt.StringC;
            }>>;
        }>, rt.PartialC<{
            gap_policy: rt.UnionC<[rt.LiteralC<"skip">, rt.LiteralC<"insert_zeros">, rt.LiteralC<"keep_values">]>;
        }>]>, rt.TypeC<{
            id: rt.StringC;
            field: rt.StringC;
            unit: rt.StringC;
            type: rt.LiteralC<"derivative">;
        }>, rt.IntersectionC<[rt.TypeC<{
            id: rt.StringC;
            type: rt.LiteralC<"percentile">;
            percentiles: rt.ArrayC<rt.TypeC<{
                id: rt.StringC;
                value: rt.NumberC;
            }>>;
        }>, rt.PartialC<{
            field: rt.StringC;
        }>]>, rt.TypeC<{
            id: rt.StringC;
            function: rt.StringC;
            type: rt.LiteralC<"series_agg">;
        }>]>>;
        split_mode: rt.StringC;
    }>, rt.PartialC<{
        terms_field: rt.StringC;
        terms_size: rt.NumberC;
        terms_order_by: rt.StringC;
        filter: rt.TypeC<{
            query: rt.StringC;
            language: rt.KeyofC<{
                lucene: null;
                kuery: null;
            }>;
        }>;
    }>]>>;
}>, rt.PartialC<{
    filter: rt.StringC;
    map_field_to: rt.StringC;
    id_type: rt.KeyofC<{
        cloud: null;
        node: null;
    }>;
    drop_last_bucket: rt.BooleanC;
}>]>;
export type TSVBMetricModel = rt.TypeOf<typeof TSVBMetricModelRT>;
export type TSVBMetricModelCreator = (timeField: string, indexPattern: string | string[], interval: string) => TSVBMetricModel;
export type MetricsUIAggregation = Record<string, estypes.AggregationsAggregate>;
export declare const SnapshotMetricTypeKeys: {
    count: null;
    cpuV2: null;
    cpu: null;
    diskLatency: null;
    diskSpaceUsage: null;
    load: null;
    memory: null;
    memoryFree: null;
    memoryTotal: null;
    normalizedLoad1m: null;
    tx: null;
    rx: null;
    txV2: null;
    rxV2: null;
    logRate: null;
    diskIOReadBytes: null;
    diskIOWriteBytes: null;
    s3TotalRequests: null;
    s3NumberOfObjects: null;
    s3BucketSize: null;
    s3DownloadBytes: null;
    s3UploadBytes: null;
    rdsConnections: null;
    rdsQueriesExecuted: null;
    rdsActiveTransactions: null;
    rdsLatency: null;
    sqsMessagesVisible: null;
    sqsMessagesDelayed: null;
    sqsMessagesSent: null;
    sqsMessagesEmpty: null;
    sqsOldestMessage: null;
    custom: null;
};
export declare const SnapshotMetricTypeRT: rt.KeyofC<{
    count: null;
    cpuV2: null;
    cpu: null;
    diskLatency: null;
    diskSpaceUsage: null;
    load: null;
    memory: null;
    memoryFree: null;
    memoryTotal: null;
    normalizedLoad1m: null;
    tx: null;
    rx: null;
    txV2: null;
    rxV2: null;
    logRate: null;
    diskIOReadBytes: null;
    diskIOWriteBytes: null;
    s3TotalRequests: null;
    s3NumberOfObjects: null;
    s3BucketSize: null;
    s3DownloadBytes: null;
    s3UploadBytes: null;
    rdsConnections: null;
    rdsQueriesExecuted: null;
    rdsActiveTransactions: null;
    rdsLatency: null;
    sqsMessagesVisible: null;
    sqsMessagesDelayed: null;
    sqsMessagesSent: null;
    sqsMessagesEmpty: null;
    sqsOldestMessage: null;
    custom: null;
}>;
export type SnapshotMetricType = rt.TypeOf<typeof SnapshotMetricTypeRT>;
type BeatsIntegrations = 'aws' | 'docker' | typeof SYSTEM_INTEGRATION | 'kubernetes';
type OtelReceivers = typeof HOST_METRICS_RECEIVER_OTEL | typeof KUBELET_STATS_RECEIVER_OTEL;
type Integrations = {
    beats: BeatsIntegrations;
    otel: OtelReceivers;
} | BeatsIntegrations;
export interface InventoryModel<TEntityType extends InventoryItemType, TAggregations extends AggregationConfigMap, TFormulas extends FormulasConfigMap | undefined = undefined, TCharts extends ChartsConfigMap | undefined = undefined> {
    id: TEntityType;
    displayName: string;
    singularDisplayName: string;
    requiredIntegration: Integrations;
    fields: {
        id: string;
        name: string;
        os?: string;
        ip?: string;
        cloudProvider?: string;
    };
    crosslinkSupport: {
        details: boolean;
        logs: boolean;
        apm: boolean;
        uptime: boolean;
    };
    metrics: InventoryMetricsConfig<TAggregations, TFormulas, TCharts>;
    nodeFilter?: (args?: {
        schema?: DataSchemaFormat;
    }) => estypes.QueryDslQueryContainer[];
}
export type LensConfigWithId = LensConfig & {
    id: string;
};
