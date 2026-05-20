import { z } from '@kbn/zod/v4';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
export declare const OBSERVABILITY_GET_ALERTS_TOOL_ID = "observability.get_alerts";
export declare const defaultFields: string[];
declare const getAlertsSchema: z.ZodObject<{
    kqlFilter: z.ZodOptional<z.ZodString>;
    includeRecovered: z.ZodDefault<z.ZodBoolean>;
    fields: z.ZodOptional<z.ZodArray<z.ZodString>>;
    start: z.ZodDefault<z.ZodString>;
    end: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare function createGetAlertsTool({ core, logger, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    logger: Logger;
}): StaticToolRegistration<typeof getAlertsSchema>;
export {};
