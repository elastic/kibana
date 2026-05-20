import type { BulkDeleteStatusResponse } from '@kbn/slo-schema';
export declare const bulkDeleteSLORoute: Record<"POST /api/observability/slos/_bulk_delete 2023-10-31", import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/observability/slos/_bulk_delete 2023-10-31", import("io-ts").TypeC<{
    body: import("io-ts").TypeC<{
        list: import("io-ts").ArrayC<import("io-ts").Type<string, string, unknown>>;
    }>;
}>, import("../types").SLORouteHandlerResources, {
    taskId: string;
}, undefined>>;
export declare const getBulkDeleteStatusRoute: Record<"GET /api/observability/slos/_bulk_delete/{taskId} 2023-10-31", import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/observability/slos/_bulk_delete/{taskId} 2023-10-31", import("io-ts").TypeC<{
    path: import("io-ts").TypeC<{
        taskId: import("io-ts").StringC;
    }>;
}>, import("../types").SLORouteHandlerResources, BulkDeleteStatusResponse, undefined>>;
