export declare const getSLOStatsOverview: Record<"GET /internal/observability/slos/overview", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability/slos/overview", import("io-ts").PartialC<{
    query: import("io-ts").PartialC<{
        kqlQuery: import("io-ts").StringC;
        filters: import("io-ts").StringC;
    }>;
}>, import("../types").SLORouteHandlerResources, {
    violated: number;
    degrading: number;
    stale: number;
    healthy: number;
    noData: number;
    burnRateRules: number;
    burnRateActiveAlerts: number;
    burnRateRecoveredAlerts: number;
}, undefined>>;
