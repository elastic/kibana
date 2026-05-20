export declare const repairSLORoute: Record<"POST /api/observability/slos/_repair", import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/observability/slos/_repair", import("io-ts").TypeC<{
    body: import("io-ts").TypeC<{
        list: import("io-ts").ArrayC<import("io-ts").Type<string, string, unknown>>;
    }>;
}>, import("../types").SLORouteHandlerResources, import("@kbn/core/server").IKibanaResponse<any>, undefined>>;
