import { z } from '@kbn/zod/v4';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
export declare const OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID = "observability.run_log_rate_analysis";
declare const logRateAnalysisSchema: z.ZodObject<{
    index: z.ZodString;
    timeFieldName: z.ZodDefault<z.ZodString>;
    baseline: z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, z.core.$strip>;
    deviation: z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, z.core.$strip>;
    kqlFilter: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare function createRunLogRateAnalysisTool({ core, logger, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    logger: Logger;
}): StaticToolRegistration<typeof logRateAnalysisSchema>;
export {};
