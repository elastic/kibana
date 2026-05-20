export declare const fetchSloHealthRoute: Record<"POST /internal/observability/slos/_health", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability/slos/_health", import("io-ts").TypeC<{
    body: import("io-ts").TypeC<{
        list: import("io-ts").ArrayC<import("io-ts").TypeC<{
            id: import("io-ts").Type<string, string, unknown>;
            instanceId: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>;
        }>>;
    }>;
}>, import("../types").SLORouteHandlerResources, {
    id: string;
    instanceId: string;
    revision: number;
    name: string;
    health: {
        isProblematic: boolean;
        rollup: {
            isProblematic: boolean;
            missing: boolean;
            status: "unavailable" | "healthy" | "unhealthy";
            state: "unavailable" | "failed" | "started" | "stopping" | "stopped" | "aborting" | "indexing";
        } & {
            stateMatches?: boolean | undefined;
        };
        summary: {
            isProblematic: boolean;
            missing: boolean;
            status: "unavailable" | "healthy" | "unhealthy";
            state: "unavailable" | "failed" | "started" | "stopping" | "stopped" | "aborting" | "indexing";
        } & {
            stateMatches?: boolean | undefined;
        };
    };
}[], undefined>>;
