import type { Paginated } from '@kbn/slo-schema';
export declare const findCompositeSLORoute: Record<"GET /api/observability/slo_composites 2023-10-31", import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/observability/slo_composites 2023-10-31", import("zod").ZodObject<{
    query: import("zod").ZodOptional<import("zod").ZodObject<{
        search: import("zod").ZodOptional<import("zod").ZodString>;
        page: import("zod").ZodOptional<import("zod").ZodString>;
        perPage: import("zod").ZodOptional<import("zod").ZodString>;
        sortBy: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"name">, import("zod").ZodLiteral<"createdAt">, import("zod").ZodLiteral<"updatedAt">]>>;
        sortDirection: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"asc">, import("zod").ZodLiteral<"desc">]>>;
        tags: import("zod").ZodOptional<import("zod").ZodString>;
        status: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<string[], string>>, import("zod").ZodArray<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"NO_DATA">, import("zod").ZodLiteral<"HEALTHY">, import("zod").ZodLiteral<"DEGRADING">, import("zod").ZodLiteral<"VIOLATED">]>>>>;
    }, import("zod/v4/core").$strip>>;
}, import("zod/v4/core").$strip>, import("../../types").SLORouteHandlerResources, Paginated<{
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
}>, undefined>>;
