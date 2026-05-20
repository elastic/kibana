export declare const createCompositeSLORoute: Record<"POST /api/observability/slo_composites 2023-10-31", import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/observability/slo_composites 2023-10-31", import("zod").ZodObject<{
    body: import("zod").ZodObject<{
        name: import("zod").ZodString;
        description: import("zod").ZodString;
        members: import("zod").ZodArray<import("zod").ZodObject<{
            sloId: import("zod").ZodString;
            weight: import("zod").ZodNumber;
            instanceId: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>>;
        compositeMethod: import("zod").ZodLiteral<"weightedAverage">;
        timeWindow: import("zod").ZodObject<{
            duration: import("zod").ZodString;
            type: import("zod").ZodLiteral<"rolling">;
        }, import("zod/v4/core").$strip>;
        budgetingMethod: import("zod").ZodLiteral<"occurrences">;
        objective: import("zod").ZodObject<{
            target: import("zod").ZodNumber;
        }, import("zod/v4/core").$strip>;
        id: import("zod").ZodOptional<import("zod").ZodString>;
        tags: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
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
    members: {
        sloId: string;
        weight: number;
        instanceId?: string | undefined;
    }[];
}, undefined>>;
