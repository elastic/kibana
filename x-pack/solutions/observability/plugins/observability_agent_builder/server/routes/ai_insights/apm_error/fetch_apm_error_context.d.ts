import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ObservabilityAgentBuilderDataRegistry } from '../../../data_registry/data_registry';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../../types';
export interface FetchApmErrorContextParams {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
    request: KibanaRequest;
    errorId: string;
    start: string;
    end: string;
    serviceName: string;
    environment?: string;
    logger: Logger;
}
export declare function fetchApmErrorContext({ core, plugins, dataRegistry, request, errorId, serviceName, start, end, environment, logger, }: FetchApmErrorContextParams): Promise<string>;
