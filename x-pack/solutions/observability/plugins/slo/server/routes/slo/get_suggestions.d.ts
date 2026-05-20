export declare const getSLOSuggestionsRoute: Record<"GET /internal/observability/slos/suggestions", {
    endpoint: "GET /internal/observability/slos/suggestions";
    handler: (options: import("../types").SLORoutesDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<{
        tags: {
            label: string;
            value: string;
            count: number;
        }[];
    }>;
    security: import("@kbn/core/server").RouteSecurity;
}>;
