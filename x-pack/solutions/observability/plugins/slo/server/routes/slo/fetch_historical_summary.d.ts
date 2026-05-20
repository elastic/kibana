export declare const fetchHistoricalSummary: Record<"POST /internal/observability/slos/_historical_summary", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability/slos/_historical_summary", import("io-ts").TypeC<{
    body: import("io-ts").TypeC<{
        list: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            sloId: import("io-ts").Type<string, string, unknown>;
            instanceId: import("io-ts").StringC;
            timeWindow: import("io-ts").UnionC<[import("io-ts").TypeC<{
                duration: import("io-ts").Type<import("@kbn/slo-schema").Duration, string, unknown>;
                type: import("io-ts").LiteralC<"rolling">;
            }>, import("io-ts").TypeC<{
                duration: import("io-ts").Type<import("@kbn/slo-schema").Duration, string, unknown>;
                type: import("io-ts").LiteralC<"calendarAligned">;
            }>]>;
            budgetingMethod: import("io-ts").UnionC<[import("io-ts").LiteralC<"occurrences">, import("io-ts").LiteralC<"timeslices">]>;
            objective: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                target: import("io-ts").NumberC;
            }>, import("io-ts").PartialC<{
                timesliceTarget: import("io-ts").NumberC;
                timesliceWindow: import("io-ts").Type<import("@kbn/slo-schema").Duration, string, unknown>;
            }>]>;
            groupBy: import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC, import("io-ts").ArrayC<import("io-ts").UnionC<[import("io-ts").LiteralC<"*">, import("io-ts").StringC]>>]>;
            revision: import("io-ts").NumberC;
        }>, import("io-ts").PartialC<{
            remoteName: import("io-ts").StringC;
            range: import("io-ts").TypeC<{
                from: import("io-ts").Type<Date, string, unknown>;
                to: import("io-ts").Type<Date, string, unknown>;
            }>;
        }>]>>;
    }>;
}>, import("../types").SLORouteHandlerResources, {
    sloId: string;
    instanceId: string;
    data: {
        date: string;
        status: "NO_DATA" | "HEALTHY" | "DEGRADING" | "VIOLATED";
        sliValue: number;
        errorBudget: {
            initial: number;
            consumed: number;
            remaining: number;
            isEstimated: boolean;
        };
    }[];
}[], undefined>>;
