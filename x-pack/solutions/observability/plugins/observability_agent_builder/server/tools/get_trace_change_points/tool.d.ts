import { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderPluginSetupDependencies, ObservabilityAgentBuilderPluginStart, ObservabilityAgentBuilderPluginStartDependencies } from '../../types';
export declare const OBSERVABILITY_GET_TRACE_CHANGE_POINTS_TOOL_ID = "observability.get_trace_change_points";
export declare function createGetTraceChangePointsTool({ core, plugins, logger, }: {
    core: CoreSetup<ObservabilityAgentBuilderPluginStartDependencies, ObservabilityAgentBuilderPluginStart>;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    logger: Logger;
}): BuiltinToolDefinition<z.ZodObject<{
    kqlFilter: z.ZodOptional<z.ZodString>;
    groupBy: z.ZodDefault<z.ZodString>;
    latencyType: z.ZodDefault<z.ZodEnum<{
        avg: "avg";
        p95: "p95";
        p99: "p99";
    }>>;
    start: z.ZodString;
    end: z.ZodString;
}, z.core.$strip>, import("@kbn/agent-builder-common").ToolResult>;
