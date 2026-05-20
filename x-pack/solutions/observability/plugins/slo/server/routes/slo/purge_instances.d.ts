export declare const purgeInstancesRoute: Record<"POST /api/observability/slos/_purge_instances", import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/observability/slos/_purge_instances", import("io-ts").TypeC<{
    body: import("io-ts").PartialC<{
        list: import("io-ts").ArrayC<import("io-ts").Type<string, string, unknown>>;
        staleDuration: import("io-ts").Type<import("@kbn/slo-schema").Duration, string, unknown>;
        force: import("io-ts").BooleanC;
    }>;
}>, import("../types").SLORouteHandlerResources, import("@kbn/slo-schema").PurgeInstancesResponse, undefined>>;
export declare const getPurgeInstancesStatusRoute: Record<"GET /api/observability/slos/_purge_instances/{taskId}", import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/observability/slos/_purge_instances/{taskId}", import("io-ts").TypeC<{
    path: import("io-ts").TypeC<{
        taskId: import("io-ts").StringC;
    }>;
}>, import("../types").SLORouteHandlerResources, {
    completed: false;
    error: string;
    status?: undefined;
} | {
    completed: false;
    status: {
        total: number;
        deleted: number;
        batches: number;
        start_time_in_millis: number;
        running_time_in_nanos: number;
    } | undefined;
    error?: undefined;
} | {
    completed: true;
    status: {
        total: number;
        deleted: number;
        batches: number;
        start_time_in_millis: number;
        running_time_in_nanos: number;
    } | undefined;
    error?: undefined;
}, undefined>>;
