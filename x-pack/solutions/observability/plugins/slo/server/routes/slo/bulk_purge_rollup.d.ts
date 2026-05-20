export declare const bulkPurgeRollupRoute: Record<"POST /api/observability/slos/_bulk_purge_rollup 2023-10-31", import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/observability/slos/_bulk_purge_rollup 2023-10-31", import("io-ts").TypeC<{
    body: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
        list: import("io-ts").ArrayC<import("io-ts").StringC>;
        purgePolicy: import("io-ts").UnionC<[import("io-ts").TypeC<{
            purgeType: import("io-ts").LiteralC<"fixed_age">;
            age: import("io-ts").Type<import("@kbn/slo-schema").Duration, string, unknown>;
        }>, import("io-ts").TypeC<{
            purgeType: import("io-ts").LiteralC<"fixed_time">;
            timestamp: import("io-ts").Type<Date, string, unknown>;
        }>]>;
    }>, import("io-ts").PartialC<{
        force: import("io-ts").BooleanC;
    }>]>;
}>, import("../types").SLORouteHandlerResources, import("@kbn/slo-schema").BulkPurgeRollupResponse, undefined>>;
