export declare const deleteSloInstancesRoute: Record<"POST /api/observability/slos/_delete_instances 2023-10-31", import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/observability/slos/_delete_instances 2023-10-31", import("io-ts").TypeC<{
    body: import("io-ts").TypeC<{
        list: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            sloId: import("io-ts").Type<string, string, unknown>;
            instanceId: import("io-ts").StringC;
        }>, import("io-ts").PartialC<{
            excludeRollup: import("io-ts").BooleanC;
        }>]>>;
    }>;
}>, import("../types").SLORouteHandlerResources, import("@kbn/core/server").IKibanaResponse<any>, undefined>>;
