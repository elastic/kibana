export declare const searchSloDefinitionsRoute: Record<"GET /internal/observability/slos/_search_definitions", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability/slos/_search_definitions", import("io-ts").PartialC<{
    query: import("io-ts").PartialC<{
        search: import("io-ts").StringC;
        size: import("io-ts").Type<number, number, unknown>;
        searchAfter: import("io-ts").StringC;
        remoteName: import("io-ts").StringC;
    }>;
}>, import("../types").SLORouteHandlerResources, import("@kbn/slo-schema").SearchSLODefinitionResponse, undefined>>;
