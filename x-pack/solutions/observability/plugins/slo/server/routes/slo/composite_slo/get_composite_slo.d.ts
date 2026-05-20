export declare const getCompositeSLORoute: Record<"GET /api/observability/slo_composites/{id} 2023-10-31", import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/observability/slo_composites/{id} 2023-10-31", import("zod").ZodObject<{
    path: import("zod").ZodObject<{
        id: import("zod").ZodString;
    }, import("zod/v4/core").$strip>;
}, import("zod/v4/core").$strip>, import("../../types").SLORouteHandlerResources, {
    id: string;
    name: string;
    description: string;
    compositeMethod: "weightedAverage";
    timeWindow: {
        duration: string;
        type: "rolling";
    };
    budgetingMethod: "occurrences";
    objective: {
        target: number;
    };
    tags: string[];
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
    version: number;
    summary: {
        sliValue: number;
        errorBudget: {
            initial: number;
            consumed: number;
            remaining: number;
            isEstimated: boolean;
        };
        status: "NO_DATA" | "HEALTHY" | "DEGRADING" | "VIOLATED";
        fiveMinuteBurnRate: number;
        oneHourBurnRate: number;
        oneDayBurnRate: number;
    };
    members: {
        id: string;
        name: string;
        weight: number;
        normalisedWeight: number;
        sliValue: number;
        status: "NO_DATA" | "HEALTHY" | "DEGRADING" | "VIOLATED";
        errorBudget?: {
            initial: number;
            consumed: number;
            remaining: number;
            isEstimated: boolean;
        } | undefined;
        fiveMinuteBurnRate?: number | undefined;
        oneHourBurnRate?: number | undefined;
        oneDayBurnRate?: number | undefined;
        instanceId?: string | undefined;
    }[];
}, undefined>>;
