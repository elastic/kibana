import * as rt from 'io-ts';
export declare const SnapshotNodePathRT: rt.IntersectionC<[rt.TypeC<{
    value: rt.StringC;
    label: rt.StringC;
}>, rt.PartialC<{
    ip: rt.UnionC<[rt.StringC, rt.NullC]>;
    os: rt.UnionC<[rt.StringC, rt.NullC]>;
    cloudProvider: rt.UnionC<[rt.StringC, rt.NullC]>;
}>]>;
export declare const SnapshotNodeMetricRT: rt.IntersectionC<[rt.TypeC<{
    name: rt.UnionC<[rt.KeyofC<{
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
    }>, rt.StringC]>;
}>, rt.PartialC<{
    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
    avg: rt.UnionC<[rt.NumberC, rt.NullC]>;
    max: rt.UnionC<[rt.NumberC, rt.NullC]>;
    timeseries: rt.IntersectionC<[rt.TypeC<{
        id: rt.StringC;
        columns: rt.ArrayC<rt.TypeC<{
            name: rt.StringC;
            type: rt.KeyofC<{
                date: null;
                number: null;
                string: null;
            }>;
        }>>;
        rows: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
            timestamp: rt.NumberC;
        }>, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NumberC, rt.NullC, rt.UndefinedC, rt.ArrayC<rt.ObjectC>]>>]>>;
    }>, rt.PartialC<{
        keys: rt.ArrayC<rt.StringC>;
    }>]>;
}>]>;
export declare const SnapshotNodeRT: rt.TypeC<{
    metrics: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
        name: rt.UnionC<[rt.KeyofC<{
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
        }>, rt.StringC]>;
    }>, rt.PartialC<{
        value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        avg: rt.UnionC<[rt.NumberC, rt.NullC]>;
        max: rt.UnionC<[rt.NumberC, rt.NullC]>;
        timeseries: rt.IntersectionC<[rt.TypeC<{
            id: rt.StringC;
            columns: rt.ArrayC<rt.TypeC<{
                name: rt.StringC;
                type: rt.KeyofC<{
                    date: null;
                    number: null;
                    string: null;
                }>;
            }>>;
            rows: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
                timestamp: rt.NumberC;
            }>, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NumberC, rt.NullC, rt.UndefinedC, rt.ArrayC<rt.ObjectC>]>>]>>;
        }>, rt.PartialC<{
            keys: rt.ArrayC<rt.StringC>;
        }>]>;
    }>]>>;
    path: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
        value: rt.StringC;
        label: rt.StringC;
    }>, rt.PartialC<{
        ip: rt.UnionC<[rt.StringC, rt.NullC]>;
        os: rt.UnionC<[rt.StringC, rt.NullC]>;
        cloudProvider: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>]>>;
    name: rt.StringC;
}>;
export declare const SnapshotNodeResponseRT: rt.IntersectionC<[rt.TypeC<{
    nodes: rt.ArrayC<rt.TypeC<{
        metrics: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
            name: rt.UnionC<[rt.KeyofC<{
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
            }>, rt.StringC]>;
        }>, rt.PartialC<{
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            avg: rt.UnionC<[rt.NumberC, rt.NullC]>;
            max: rt.UnionC<[rt.NumberC, rt.NullC]>;
            timeseries: rt.IntersectionC<[rt.TypeC<{
                id: rt.StringC;
                columns: rt.ArrayC<rt.TypeC<{
                    name: rt.StringC;
                    type: rt.KeyofC<{
                        date: null;
                        number: null;
                        string: null;
                    }>;
                }>>;
                rows: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
                    timestamp: rt.NumberC;
                }>, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NumberC, rt.NullC, rt.UndefinedC, rt.ArrayC<rt.ObjectC>]>>]>>;
            }>, rt.PartialC<{
                keys: rt.ArrayC<rt.StringC>;
            }>]>;
        }>]>>;
        path: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
            value: rt.StringC;
            label: rt.StringC;
        }>, rt.PartialC<{
            ip: rt.UnionC<[rt.StringC, rt.NullC]>;
            os: rt.UnionC<[rt.StringC, rt.NullC]>;
            cloudProvider: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>]>>;
        name: rt.StringC;
    }>>;
}>, rt.PartialC<{
    interval: rt.StringC;
}>]>;
export declare const InfraTimerangeInputRT: rt.IntersectionC<[rt.TypeC<{
    interval: rt.StringC;
    to: rt.NumberC;
    from: rt.NumberC;
}>, rt.PartialC<{
    lookbackSize: rt.NumberC;
    ignoreLookback: rt.BooleanC;
    forceInterval: rt.BooleanC;
}>]>;
export declare const SnapshotGroupByRT: rt.ArrayC<rt.PartialC<{
    label: rt.UnionC<[rt.StringC, rt.NullC]>;
    field: rt.UnionC<[rt.StringC, rt.NullC]>;
}>>;
export declare const SnapshotNamedMetricInputRT: rt.TypeC<{
    type: rt.KeyofC<{
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
}>;
export declare const SNAPSHOT_CUSTOM_AGGREGATIONS: readonly ["avg", "max", "min", "rate", "last_value"];
export type SnapshotCustomAggregation = (typeof SNAPSHOT_CUSTOM_AGGREGATIONS)[number];
export declare const SnapshotCustomAggregationRT: rt.KeyofC<Record<"avg" | "max" | "min" | "rate" | "last_value", null>>;
export declare const SnapshotCustomMetricInputRT: rt.IntersectionC<[rt.TypeC<{
    type: rt.LiteralC<"custom">;
    field: rt.StringC;
    aggregation: rt.KeyofC<Record<"avg" | "max" | "min" | "rate" | "last_value", null>>;
    id: rt.StringC;
}>, rt.PartialC<{
    label: rt.StringC;
}>]>;
export declare const SnapshotMetricInputRT: rt.UnionC<[rt.TypeC<{
    type: rt.KeyofC<{
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
}>, rt.IntersectionC<[rt.TypeC<{
    type: rt.LiteralC<"custom">;
    field: rt.StringC;
    aggregation: rt.KeyofC<Record<"avg" | "max" | "min" | "rate" | "last_value", null>>;
    id: rt.StringC;
}>, rt.PartialC<{
    label: rt.StringC;
}>]>]>;
export declare const SnapshotRequestRT: rt.IntersectionC<[rt.TypeC<{
    timerange: rt.IntersectionC<[rt.TypeC<{
        interval: rt.StringC;
        to: rt.NumberC;
        from: rt.NumberC;
    }>, rt.PartialC<{
        lookbackSize: rt.NumberC;
        ignoreLookback: rt.BooleanC;
        forceInterval: rt.BooleanC;
    }>]>;
    metrics: rt.ArrayC<rt.UnionC<[rt.TypeC<{
        type: rt.KeyofC<{
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
    }>, rt.IntersectionC<[rt.TypeC<{
        type: rt.LiteralC<"custom">;
        field: rt.StringC;
        aggregation: rt.KeyofC<Record<"avg" | "max" | "min" | "rate" | "last_value", null>>;
        id: rt.StringC;
    }>, rt.PartialC<{
        label: rt.StringC;
    }>]>]>>;
    groupBy: rt.UnionC<[rt.ArrayC<rt.PartialC<{
        label: rt.UnionC<[rt.StringC, rt.NullC]>;
        field: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>, rt.NullC]>;
    nodeType: rt.KeyofC<{
        host: null;
        pod: null;
        container: null;
        awsEC2: null;
        awsS3: null;
        awsSQS: null;
        awsRDS: null;
    }>;
    sourceId: rt.StringC;
}>, rt.PartialC<{
    includeTimeseries: rt.UnionC<[rt.BooleanC, rt.Type<false, undefined, unknown>]>;
    accountId: rt.StringC;
    region: rt.StringC;
    kuery: rt.StringC;
    overrideCompositeSize: rt.NumberC;
    dropPartialBuckets: rt.BooleanC;
    schema: rt.KeyofC<{
        ecs: null;
        semconv: null;
    }>;
}>]>;
export type SnapshotNodePath = rt.TypeOf<typeof SnapshotNodePathRT>;
export type SnapshotMetricInput = rt.TypeOf<typeof SnapshotMetricInputRT>;
export type SnapshotCustomMetricInput = rt.TypeOf<typeof SnapshotCustomMetricInputRT>;
export type InfraTimerangeInput = rt.TypeOf<typeof InfraTimerangeInputRT>;
export type SnapshotNodeMetric = rt.TypeOf<typeof SnapshotNodeMetricRT>;
export type SnapshotGroupBy = rt.TypeOf<typeof SnapshotGroupByRT>;
export type SnapshotRequest = rt.TypeOf<typeof SnapshotRequestRT>;
export type SnapshotNode = rt.TypeOf<typeof SnapshotNodeRT>;
export type SnapshotNodeResponse = rt.TypeOf<typeof SnapshotNodeResponseRT>;
