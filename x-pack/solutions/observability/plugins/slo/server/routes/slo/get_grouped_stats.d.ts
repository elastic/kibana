export declare const getSLOGroupedStatsRoute: Record<"POST /internal/slos/_grouped_stats", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/slos/_grouped_stats", import("io-ts").TypeC<{
    body: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
        type: import("io-ts").LiteralC<"apm">;
    }>, import("io-ts").PartialC<{
        size: import("io-ts").NumberC;
        serviceNames: import("io-ts").ArrayC<import("io-ts").StringC>;
        environment: import("io-ts").StringC;
        kqlQuery: import("io-ts").StringC;
        statusFilters: import("io-ts").ArrayC<import("io-ts").StringC>;
    }>]>;
}>, import("../types").SLORouteHandlerResources, import("@kbn/slo-schema").GetSLOGroupedStatsResponse, undefined>>;
