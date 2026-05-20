export declare const updateSloSettings: (isServerless?: boolean) => Record<"PUT /internal/slo/settings", import("@kbn/server-route-repository-utils").ServerRoute<"PUT /internal/slo/settings", import("io-ts").TypeC<{
    body: import("io-ts").TypeC<{
        useAllRemoteClusters: import("io-ts").BooleanC;
        selectedRemoteClusters: import("io-ts").ArrayC<import("io-ts").StringC>;
        staleThresholdInHours: import("io-ts").NumberC;
        staleInstancesCleanupEnabled: import("io-ts").BooleanC;
    }>;
}> | import("io-ts").TypeC<{
    body: import("io-ts").TypeC<{
        staleThresholdInHours: import("io-ts").NumberC;
        staleInstancesCleanupEnabled: import("io-ts").BooleanC;
    }>;
}>, import("../types").SLORouteHandlerResources, {
    useAllRemoteClusters: boolean;
    selectedRemoteClusters: string[];
    staleThresholdInHours: number;
    staleInstancesCleanupEnabled: boolean;
}, undefined>>;
