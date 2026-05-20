import type { IKibanaResponse } from '@kbn/core-http-server';
export declare const alertsSuggestedDashboardRepository: Record<"GET /internal/observability/alerts/related_dashboards", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability/alerts/related_dashboards", import("zod").ZodObject<{
    query: import("zod").ZodObject<{
        alertId: import("zod").ZodString;
    }, import("zod/v4/core").$strip>;
}, import("zod/v4/core").$strip>, import("../types").ObservabilityRouteHandlerResources, IKibanaResponse<any> | {
    suggestedDashboards: {
        matchedBy: {
            fields?: string[] | undefined;
            index?: string[] | undefined;
        };
        score: number;
        id: string;
        title: string;
        description?: string | undefined;
        tags?: string[] | undefined;
    }[];
    linkedDashboards: {
        matchedBy: {
            fields?: string[] | undefined;
            index?: string[] | undefined;
            linked?: boolean | undefined;
        };
        id: string;
        title: string;
        description?: string | undefined;
        tags?: string[] | undefined;
    }[];
}, import("../types").ObservabilityRouteCreateOptions>>;
