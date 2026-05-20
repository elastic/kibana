import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type { ServicesItemsItem } from '../../data_registry/data_registry_types';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../types';
export declare function getToolHandler({ core, plugins, request, esClient, dataRegistry, logger, start, end, anomalySeverities, kqlFilter, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    request: KibanaRequest;
    esClient: IScopedClusterClient;
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
    logger: Logger;
    start: string;
    end: string;
    anomalySeverities?: ML_ANOMALY_SEVERITY[];
    kqlFilter?: string;
}): Promise<{
    services: ServicesItemsItem[];
    maxCountExceeded: boolean;
    serviceOverflowCount: number;
}>;
