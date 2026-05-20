export declare const fetchCompositeHistoricalSummaryRoute: Record<"POST /internal/observability/slo_composites/_historical_summary", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability/slo_composites/_historical_summary", import("zod").ZodObject<{
    body: import("zod").ZodObject<{
        list: import("zod").ZodArray<import("zod").ZodString>;
    }, import("zod/v4/core").$strip>;
}, import("zod/v4/core").$strip>, import("../../types").SLORouteHandlerResources, {
    compositeId: string;
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
