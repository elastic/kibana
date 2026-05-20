import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type { OtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../types';
import { type RuntimeMetricsNode } from './handler';
export declare const OBSERVABILITY_GET_RUNTIME_METRICS_TOOL_ID = "observability.get_runtime_metrics";
export type GetRuntimeMetricsToolResult = OtherResult<{
    total: number;
    nodes: RuntimeMetricsNode[];
}>;
declare const getRuntimeMetricsToolSchema: z.ZodObject<{
    serviceName: z.ZodOptional<z.ZodString>;
    serviceEnvironment: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    kqlFilter: z.ZodOptional<z.ZodString>;
    start: z.ZodDefault<z.ZodString>;
    end: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare function createGetRuntimeMetricsTool({ core, plugins, logger, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    logger: Logger;
}): StaticToolRegistration<typeof getRuntimeMetricsToolSchema>;
export {};
