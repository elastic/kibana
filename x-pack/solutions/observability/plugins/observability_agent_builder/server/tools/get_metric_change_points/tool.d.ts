import { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../types';
export declare const OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID = "observability.get_metric_change_points";
export declare function createGetMetricChangePointsTool({ core, plugins, logger, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    logger: Logger;
}): BuiltinToolDefinition<z.ZodObject<{
    index: z.ZodOptional<z.ZodString>;
    kqlFilter: z.ZodOptional<z.ZodString>;
    aggregation: z.ZodOptional<z.ZodObject<{
        field: z.ZodString;
        type: z.ZodEnum<{
            min: "min";
            max: "max";
            sum: "sum";
            avg: "avg";
            p95: "p95";
            p99: "p99";
        }>;
    }, z.core.$strip>>;
    groupBy: z.ZodDefault<z.ZodArray<z.ZodString>>;
    start: z.ZodString;
    end: z.ZodString;
}, z.core.$strip>, import("@kbn/agent-builder-common").ToolResult>;
