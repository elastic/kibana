import { z } from '@kbn/zod/v4';
/**
 * Extends the generated AttackDiscoveryScheduleParams with optional fields
 * used by the workflow orchestration layer in the discoveries plugin.
 */
export type AttackDiscoveryScheduleParamsExtended = z.infer<typeof AttackDiscoveryScheduleParamsExtended>;
export declare const AttackDiscoveryScheduleParamsExtended: z.ZodObject<{
    alertsIndexPattern: z.ZodString;
    apiConfig: z.ZodObject<{
        connectorId: z.ZodString;
        actionTypeId: z.ZodString;
        defaultSystemPromptId: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodEnum<{
            "Azure OpenAI": "Azure OpenAI";
            OpenAI: "OpenAI";
            Other: "Other";
        }>>;
        model: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
    }, z.core.$strip>;
    end: z.ZodOptional<z.ZodString>;
    query: z.ZodOptional<z.ZodObject<{
        query: z.ZodUnion<readonly [z.ZodString, z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>]>;
        language: z.ZodString;
    }, z.core.$strip>>;
    filters: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
    combinedFilter: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    size: z.ZodNumber;
    start: z.ZodOptional<z.ZodString>;
    insightType: z.ZodOptional<z.ZodString>;
    workflowConfig: z.ZodOptional<z.ZodObject<{
        graphId: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
