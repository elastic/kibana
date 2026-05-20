export declare const findSLOGroupsRoute: Record<"GET /internal/observability/slos/_groups", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability/slos/_groups", import("io-ts").PartialC<{
    query: import("io-ts").PartialC<{
        page: import("io-ts").StringC;
        perPage: import("io-ts").StringC;
        groupBy: import("io-ts").UnionC<[import("io-ts").LiteralC<"ungrouped">, import("io-ts").LiteralC<"slo.tags">, import("io-ts").LiteralC<"status">, import("io-ts").LiteralC<"slo.indicator.type">, import("io-ts").LiteralC<"slo.instanceId">, import("io-ts").LiteralC<"_index">, import("io-ts").LiteralC<"slo.id">]>;
        groupsFilter: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").StringC>, import("io-ts").StringC]>;
        kqlQuery: import("io-ts").StringC;
        filters: import("io-ts").StringC;
    }>;
}>, import("../types").SLORouteHandlerResources, {
    page: number;
    perPage: number;
    total: number;
    results: {
        group: string;
        groupBy: "status" | "_index" | "ungrouped" | "slo.id" | "slo.instanceId" | "slo.tags" | "slo.indicator.type";
        summary: {
            total: number;
            worst: {
                sliValue: number;
                status: string;
                slo: {
                    id: string;
                    instanceId: string;
                    name: string;
                } & {
                    groupings?: {
                        [x: string]: unknown;
                    } | undefined;
                };
            };
            violated: number;
            healthy: number;
            degrading: number;
            noData: number;
        };
    }[];
}, undefined>>;
