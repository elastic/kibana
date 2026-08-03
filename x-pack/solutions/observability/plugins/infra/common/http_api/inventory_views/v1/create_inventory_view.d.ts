import * as rt from 'io-ts';
import type { inventoryViewRT } from '../../../inventory_views';
export declare const createInventoryViewAttributesRequestPayloadRT: rt.ExactC<rt.IntersectionC<[rt.IntersectionC<[rt.IntersectionC<[rt.TypeC<{
    accountId: rt.StringC;
    autoBounds: rt.BooleanC;
    boundsOverride: rt.TypeC<{
        min: rt.Type<number, number, unknown>;
        max: rt.Type<number, number, unknown>;
    }>;
    customMetrics: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
        type: rt.LiteralC<"custom">;
        field: rt.StringC;
        aggregation: rt.KeyofC<Record<"avg" | "max" | "min" | "rate" | "last_value", null>>;
        id: rt.StringC;
    }>, rt.PartialC<{
        label: rt.StringC;
    }>]>>;
    customOptions: rt.ArrayC<rt.TypeC<{
        text: rt.StringC;
        field: rt.StringC;
    }>>;
    groupBy: rt.ArrayC<rt.PartialC<{
        label: rt.UnionC<[rt.StringC, rt.NullC]>;
        field: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>;
    metric: rt.UnionC<[rt.TypeC<{
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
    nodeType: rt.KeyofC<{
        host: null;
        pod: null;
        container: null;
        awsEC2: null;
        awsS3: null;
        awsSQS: null;
        awsRDS: null;
    }>;
    region: rt.StringC;
    sort: rt.TypeC<{
        by: rt.KeyofC<{
            name: null;
            value: null;
        }>;
        direction: rt.KeyofC<{
            asc: null;
            desc: null;
        }>;
    }>;
    view: rt.KeyofC<{
        table: null;
        map: null;
    }>;
}>, rt.PartialC<{
    legend: rt.IntersectionC<[rt.TypeC<{
        palette: rt.KeyofC<{
            status: null;
            temperature: null;
            cool: null;
            warm: null;
            positive: null;
            negative: null;
        }>;
        steps: rt.Type<number, number, unknown>;
        reverseColors: rt.BooleanC;
    }>, rt.PartialC<{
        type: rt.KeyofC<{
            gradient: null;
            steps: null;
        }>;
        rules: rt.ArrayC<rt.TypeC<{
            color: rt.StringC;
            value: rt.NumberC;
            label: rt.StringC;
        }>>;
    }>]>;
    source: rt.StringC;
    timelineOpen: rt.BooleanC;
    preferredSchema: rt.UnionC<[rt.KeyofC<{
        ecs: null;
        semconv: null;
    }>, rt.NullC]>;
}>]>, rt.TypeC<{
    name: rt.BrandC<rt.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
}>, rt.PartialC<{
    isDefault: rt.BooleanC;
    isStatic: rt.BooleanC;
}>, rt.TypeC<{
    autoReload: rt.BooleanC;
    filterQuery: rt.TypeC<{
        kind: rt.LiteralC<"kuery">;
        expression: rt.StringC;
    }>;
}>, rt.PartialC<{
    time: rt.NumberC;
}>]>, rt.PartialC<{
    isDefault: rt.UndefinedC;
    isStatic: rt.UndefinedC;
}>]>>;
export type CreateInventoryViewAttributesRequestPayload = rt.TypeOf<typeof createInventoryViewAttributesRequestPayloadRT>;
export declare const createInventoryViewRequestPayloadRT: rt.TypeC<{
    attributes: rt.ExactC<rt.IntersectionC<[rt.IntersectionC<[rt.IntersectionC<[rt.TypeC<{
        accountId: rt.StringC;
        autoBounds: rt.BooleanC;
        boundsOverride: rt.TypeC<{
            min: rt.Type<number, number, unknown>;
            max: rt.Type<number, number, unknown>;
        }>;
        customMetrics: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
            type: rt.LiteralC<"custom">;
            field: rt.StringC;
            aggregation: rt.KeyofC<Record<"avg" | "max" | "min" | "rate" | "last_value", null>>;
            id: rt.StringC;
        }>, rt.PartialC<{
            label: rt.StringC;
        }>]>>;
        customOptions: rt.ArrayC<rt.TypeC<{
            text: rt.StringC;
            field: rt.StringC;
        }>>;
        groupBy: rt.ArrayC<rt.PartialC<{
            label: rt.UnionC<[rt.StringC, rt.NullC]>;
            field: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>;
        metric: rt.UnionC<[rt.TypeC<{
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
        nodeType: rt.KeyofC<{
            host: null;
            pod: null;
            container: null;
            awsEC2: null;
            awsS3: null;
            awsSQS: null;
            awsRDS: null;
        }>;
        region: rt.StringC;
        sort: rt.TypeC<{
            by: rt.KeyofC<{
                name: null;
                value: null;
            }>;
            direction: rt.KeyofC<{
                asc: null;
                desc: null;
            }>;
        }>;
        view: rt.KeyofC<{
            table: null;
            map: null;
        }>;
    }>, rt.PartialC<{
        legend: rt.IntersectionC<[rt.TypeC<{
            palette: rt.KeyofC<{
                status: null;
                temperature: null;
                cool: null;
                warm: null;
                positive: null;
                negative: null;
            }>;
            steps: rt.Type<number, number, unknown>;
            reverseColors: rt.BooleanC;
        }>, rt.PartialC<{
            type: rt.KeyofC<{
                gradient: null;
                steps: null;
            }>;
            rules: rt.ArrayC<rt.TypeC<{
                color: rt.StringC;
                value: rt.NumberC;
                label: rt.StringC;
            }>>;
        }>]>;
        source: rt.StringC;
        timelineOpen: rt.BooleanC;
        preferredSchema: rt.UnionC<[rt.KeyofC<{
            ecs: null;
            semconv: null;
        }>, rt.NullC]>;
    }>]>, rt.TypeC<{
        name: rt.BrandC<rt.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
    }>, rt.PartialC<{
        isDefault: rt.BooleanC;
        isStatic: rt.BooleanC;
    }>, rt.TypeC<{
        autoReload: rt.BooleanC;
        filterQuery: rt.TypeC<{
            kind: rt.LiteralC<"kuery">;
            expression: rt.StringC;
        }>;
    }>, rt.PartialC<{
        time: rt.NumberC;
    }>]>, rt.PartialC<{
        isDefault: rt.UndefinedC;
        isStatic: rt.UndefinedC;
    }>]>>;
}>;
export type CreateInventoryViewResponsePayload = rt.TypeOf<typeof inventoryViewRT>;
