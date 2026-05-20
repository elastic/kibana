export declare const getCompositeSLOSuggestionsRoute: Record<"GET /internal/observability/slo_composites/suggestions", {
    endpoint: "GET /internal/observability/slo_composites/suggestions";
    handler: (options: import("../../types").SLORoutesDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<import("../../../services/composites/get_composite_slo_suggestions").CompositeSLOSuggestionsResponse>;
    security: import("@kbn/core/server").RouteSecurity;
}>;
