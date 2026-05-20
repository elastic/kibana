import { z } from '@kbn/zod/v4';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderPluginSetupDependencies, ObservabilityAgentBuilderPluginStart, ObservabilityAgentBuilderPluginStartDependencies } from '../../types';
export declare const OBSERVABILITY_GET_INDEX_INFO_TOOL_ID = "observability.get_index_info";
declare const getIndexInfoSchema: z.ZodObject<{
    kqlFilter: z.ZodOptional<z.ZodString>;
    intent: z.ZodOptional<z.ZodString>;
    start: z.ZodDefault<z.ZodString>;
    end: z.ZodDefault<z.ZodString>;
    operation: z.ZodEnum<{
        "get-index-patterns": "get-index-patterns";
        "list-fields": "list-fields";
        "get-field-values": "get-field-values";
    }>;
    index: z.ZodOptional<z.ZodString>;
    fields: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare function createGetIndexInfoTool({ core, plugins, logger, }: {
    core: CoreSetup<ObservabilityAgentBuilderPluginStartDependencies, ObservabilityAgentBuilderPluginStart>;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    logger: Logger;
}): StaticToolRegistration<typeof getIndexInfoSchema>;
export {};
