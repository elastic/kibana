import { z } from '@kbn/zod/v4';
import type { OtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
export declare const OBSERVABILITY_GET_HOSTS_TOOL_ID = "observability.get_hosts";
export type GetHostsToolResult = OtherResult<{
    total: number;
    hosts: Array<{
        name: string;
        metrics: Array<{
            name: string;
            value: number | null;
        }>;
        metadata: Array<{
            name: string;
            value: string | number | null;
        }>;
    }>;
}>;
declare const getHostsSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    kqlFilter: z.ZodOptional<z.ZodString>;
    start: z.ZodDefault<z.ZodString>;
    end: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare function createGetHostsTool({ core, logger, dataRegistry, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    logger: Logger;
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
}): StaticToolRegistration<typeof getHostsSchema>;
export {};
