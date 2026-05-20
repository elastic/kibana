import type { ElasticsearchClient, Logger } from '@kbn/core/server';
export declare const deleteCompositeSummaryDoc: (esClient: ElasticsearchClient, spaceId: string, id: string, logger: Logger) => Promise<void>;
export declare const deleteCompositeSLORoute: Record<"DELETE /api/observability/slo_composites/{id} 2023-10-31", import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /api/observability/slo_composites/{id} 2023-10-31", import("zod").ZodObject<{
    path: import("zod").ZodObject<{
        id: import("zod").ZodString;
    }, import("zod/v4/core").$strip>;
}, import("zod/v4/core").$strip>, import("../../types").SLORouteHandlerResources, import("@kbn/core/server").IKibanaResponse<any>, undefined>>;
