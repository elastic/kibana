import { z } from '@kbn/zod/v4';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../types';
export declare const OBSERVABILITY_GET_TRACES_TOOL_ID = "observability.get_traces";
declare const getTracesSchema: z.ZodObject<{
    index: z.ZodOptional<z.ZodString>;
    kqlFilter: z.ZodString;
    maxTraces: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    maxDocsPerTrace: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    fields: z.ZodDefault<z.ZodArray<z.ZodString>>;
    start: z.ZodDefault<z.ZodString>;
    end: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare function createGetTracesTool({ core, plugins, logger, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    logger: Logger;
}): StaticToolRegistration<typeof getTracesSchema>;
export {};
