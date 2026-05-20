import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../types';
export declare const OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID = "observability.get_trace_metrics";
declare const getTraceMetricsSchema: z.ZodObject<{
    kqlFilter: z.ZodOptional<z.ZodString>;
    groupBy: z.ZodDefault<z.ZodString>;
    latencyType: z.ZodDefault<z.ZodEnum<{
        avg: "avg";
        p95: "p95";
        p99: "p99";
    }>>;
    sortBy: z.ZodDefault<z.ZodEnum<{
        latency: "latency";
        throughput: "throughput";
        failureRate: "failureRate";
    }>>;
    start: z.ZodString;
    end: z.ZodString;
}, z.core.$strip>;
export declare function createGetTraceMetricsTool({ core, plugins, logger, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    logger: Logger;
}): StaticToolRegistration<typeof getTraceMetricsSchema>;
export {};
