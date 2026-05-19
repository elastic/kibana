import type { EndpointOf } from '@kbn/server-route-repository';
import type { ObservabilityConfig } from '..';
export declare function getObservabilityServerRouteRepository(config: ObservabilityConfig): {
    "GET /internal/observability/alerts/related_dashboards": import("@kbn/server-route-repository").ServerRoute<"GET /internal/observability/alerts/related_dashboards", import("zod").ZodObject<{
        query: import("zod").ZodObject<{
            alertId: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>, import("./types").ObservabilityRouteHandlerResources, import("@kbn/core/server").IKibanaResponse<any> | {
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
    }, import("./types").ObservabilityRouteCreateOptions>;
    "GET /api/observability/rules/alerts/dynamic_index_pattern 2023-10-31": import("@kbn/server-route-repository").ServerRoute<"GET /api/observability/rules/alerts/dynamic_index_pattern 2023-10-31", import("io-ts").TypeC<{
        query: import("io-ts").TypeC<{
            registrationContexts: import("io-ts").ArrayC<import("io-ts").StringC>;
            namespace: import("io-ts").StringC;
        }>;
    }>, import("./types").ObservabilityRouteHandlerResources, string[], import("./types").ObservabilityRouteCreateOptions>;
    "GET /internal/observability/assistant/alert_details_contextual_insights": import("@kbn/server-route-repository").ServerRoute<"GET /internal/observability/assistant/alert_details_contextual_insights", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            alert_started_at: import("io-ts").StringC;
        }>, import("io-ts").PartialC<{
            alert_rule_parameter_time_size: import("io-ts").StringC;
            alert_rule_parameter_time_unit: import("io-ts").StringC;
            'service.name': import("io-ts").StringC;
            'service.environment': import("io-ts").StringC;
            'transaction.type': import("io-ts").StringC;
            'transaction.name': import("io-ts").StringC;
            'host.name': import("io-ts").StringC;
            'container.id': import("io-ts").StringC;
            'kubernetes.pod.name': import("io-ts").StringC;
        }>]>;
    }>, import("./types").ObservabilityRouteHandlerResources, {
        alertContext: import("../services").AlertDetailsContextualInsight[];
    }, import("./types").ObservabilityRouteCreateOptions>;
};
export type ObservabilityServerRouteRepository = ReturnType<typeof getObservabilityServerRouteRepository>;
export type APIEndpoint = EndpointOf<ObservabilityServerRouteRepository>;
