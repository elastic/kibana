import { z } from '@kbn/zod/v4';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../types';
import { getToolHandler } from './handler';
export interface GetLogGroupsToolResult {
    type: ToolResultType.other;
    data: {
        groups: Awaited<ReturnType<typeof getToolHandler>>;
    };
}
export declare const OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID = "observability.get_log_groups";
declare const getLogsSchema: z.ZodObject<{
    index: z.ZodOptional<z.ZodString>;
    kqlFilter: z.ZodOptional<z.ZodString>;
    fields: z.ZodDefault<z.ZodArray<z.ZodString>>;
    includeStackTrace: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    includeFirstSeen: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    start: z.ZodDefault<z.ZodString>;
    end: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare function createGetLogGroupsTool({ core, plugins, logger, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    logger: Logger;
}): StaticToolRegistration<typeof getLogsSchema>;
export {};
