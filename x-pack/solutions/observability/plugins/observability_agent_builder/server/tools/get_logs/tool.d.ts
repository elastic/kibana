import { z } from '@kbn/zod/v4';
import { type OtherResult, type ErrorResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import { OBSERVABILITY_GET_LOGS_TOOL_ID } from './constants';
import type { GetLogsResult } from './handler';
export type GetLogsToolSuccessResult = OtherResult<GetLogsResult>;
type GetLogsHandlerResult = GetLogsToolSuccessResult | ErrorResult;
declare const getLogsSchema: z.ZodObject<{
    index: z.ZodOptional<z.ZodString>;
    kqlFilter: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    bucketSize: z.ZodOptional<z.ZodString>;
    groupBy: z.ZodOptional<z.ZodString>;
    fields: z.ZodDefault<z.ZodArray<z.ZodString>>;
    start: z.ZodDefault<z.ZodString>;
    end: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare function createGetLogsTool({ core, logger, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    logger: Logger;
}): StaticToolRegistration<typeof getLogsSchema, GetLogsHandlerResult>;
export { OBSERVABILITY_GET_LOGS_TOOL_ID };
