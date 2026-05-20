export declare const getSloSettingsRoute: Record<"GET /internal/slo/settings", {
    endpoint: "GET /internal/slo/settings";
    handler: (options: import("../types").SLORoutesDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<{
        useAllRemoteClusters: boolean;
        selectedRemoteClusters: string[];
        staleThresholdInHours: number;
        staleInstancesCleanupEnabled: boolean;
    }>;
    security: import("@kbn/core/server").RouteSecurity;
}>;
