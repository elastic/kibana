import { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../types';
export declare const OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID = "observability.get_log_change_points";
export declare function createGetLogChangePointsTool({ core, plugins, logger, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    logger: Logger;
}): BuiltinToolDefinition<z.ZodObject<{
    index: z.ZodOptional<z.ZodString>;
    kqlFilter: z.ZodOptional<z.ZodString>;
    messageField: z.ZodDefault<z.ZodString>;
    start: z.ZodString;
    end: z.ZodString;
}, z.core.$strip>, import("@kbn/agent-builder-common").ToolResult>;
