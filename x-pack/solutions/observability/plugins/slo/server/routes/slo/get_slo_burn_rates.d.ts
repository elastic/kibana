export declare const getSloBurnRates: Record<"POST /internal/observability/slos/{id}/_burn_rates", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability/slos/{id}/_burn_rates", import("io-ts").TypeC<{
    path: import("io-ts").TypeC<{
        id: import("io-ts").StringC;
    }>;
    body: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
        instanceId: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>;
        windows: import("io-ts").ArrayC<import("io-ts").TypeC<{
            name: import("io-ts").StringC;
            duration: import("io-ts").Type<import("@kbn/slo-schema").Duration, string, unknown>;
        }>>;
    }>, import("io-ts").PartialC<{
        remoteName: import("io-ts").StringC;
    }>]>;
}>, import("../types").SLORouteHandlerResources, {
    burnRates: {
        name: string;
        burnRate: number;
        sli: number;
    }[];
}, undefined>>;
