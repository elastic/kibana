import type { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../types';
export declare const OBSERVABILITY_GET_APM_CORRELATIONS_TOOL_ID = "observability.get_apm_correlations";
declare const getApmCorrelationsSchema: z.ZodObject<{
    kqlFilter: z.ZodOptional<z.ZodString>;
    metric: z.ZodDefault<z.ZodEnum<{
        latency: "latency";
        failure_rate: "failure_rate";
    }>>;
    percentileThreshold: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    fieldCandidates: z.ZodOptional<z.ZodArray<z.ZodString>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    start: z.ZodString;
    end: z.ZodString;
}, z.core.$strip>;
export declare function createGetApmCorrelationsTool({ core, plugins, logger, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    logger: Logger;
}): StaticToolRegistration<typeof getApmCorrelationsSchema>;
export {};
