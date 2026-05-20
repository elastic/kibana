import * as t from 'io-ts';
export declare const rulesRouteRepository: Record<"GET /api/observability/rules/alerts/dynamic_index_pattern 2023-10-31", import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/observability/rules/alerts/dynamic_index_pattern 2023-10-31", t.TypeC<{
    query: t.TypeC<{
        registrationContexts: t.ArrayC<t.StringC>;
        namespace: t.StringC;
    }>;
}>, import("../types").ObservabilityRouteHandlerResources, string[], import("../types").ObservabilityRouteCreateOptions>>;
