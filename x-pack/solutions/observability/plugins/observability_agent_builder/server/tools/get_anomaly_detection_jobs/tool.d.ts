import type { z } from '@kbn/zod/v4';
import type { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../types';
import type { getToolHandler } from './handler';
export declare const OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID = "observability.get_anomaly_detection_jobs";
export interface GetAnomalyDetectionJobsToolResult {
    type: ToolResultType.other;
    data: {
        jobs: Awaited<ReturnType<typeof getToolHandler>>;
        total: number;
        message?: string;
    };
}
declare const getAnomalyDetectionJobsSchema: z.ZodObject<{
    start: z.ZodDefault<z.ZodString>;
    end: z.ZodDefault<z.ZodString>;
    group: z.ZodOptional<z.ZodString>;
    jobIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    jobsLimit: z.ZodDefault<z.ZodNumber>;
    anomalyRecordsLimit: z.ZodDefault<z.ZodNumber>;
    minAnomalyScore: z.ZodDefault<z.ZodNumber>;
    includeExplanation: z.ZodDefault<z.ZodBoolean>;
    influencerFilter: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare function createGetAnomalyDetectionJobsTool({ core, plugins, logger, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    logger: Logger;
}): StaticToolRegistration<typeof getAnomalyDetectionJobsSchema>;
export {};
