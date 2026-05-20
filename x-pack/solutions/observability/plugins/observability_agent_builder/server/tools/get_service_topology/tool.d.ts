import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../types';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
export declare const OBSERVABILITY_GET_SERVICE_TOPOLOGY_TOOL_ID = "observability.get_service_topology";
declare const getServiceTopologyToolSchema: z.ZodObject<{
    serviceName: z.ZodString;
    direction: z.ZodDefault<z.ZodEnum<{
        both: "both";
        downstream: "downstream";
        upstream: "upstream";
    }>>;
    depth: z.ZodOptional<z.ZodNumber>;
    start: z.ZodDefault<z.ZodString>;
    end: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare function createGetServiceTopologyTool({ core, plugins, dataRegistry, logger, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
    logger: Logger;
}): StaticToolRegistration<typeof getServiceTopologyToolSchema>;
export {};
