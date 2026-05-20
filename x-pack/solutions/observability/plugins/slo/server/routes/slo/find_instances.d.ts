export declare const findSLOInstancesRoute: Record<"GET /internal/observability/slos/{id}/_instances", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability/slos/{id}/_instances", import("io-ts").IntersectionC<[import("io-ts").TypeC<{
    path: import("io-ts").TypeC<{
        id: import("io-ts").StringC;
    }>;
}>, import("io-ts").PartialC<{
    query: import("io-ts").PartialC<{
        search: import("io-ts").StringC;
        size: import("io-ts").Type<number, number, unknown>;
        searchAfter: import("io-ts").StringC;
        remoteName: import("io-ts").StringC;
    }>;
}>]>, import("../types").SLORouteHandlerResources, import("@kbn/slo-schema").FindSLOInstancesResponse, undefined>>;
