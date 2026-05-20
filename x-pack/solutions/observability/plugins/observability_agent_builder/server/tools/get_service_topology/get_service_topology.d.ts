import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../types';
import type { TopologyDirection, ServiceTopologyResponse } from './types';
export declare function getServiceTopology({ core, plugins, dataRegistry, request, logger, serviceName, direction, depth, start, end, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
    request: KibanaRequest;
    logger: Logger;
    serviceName: string;
    direction?: TopologyDirection;
    depth?: number;
    start: string;
    end: string;
}): Promise<ServiceTopologyResponse>;
