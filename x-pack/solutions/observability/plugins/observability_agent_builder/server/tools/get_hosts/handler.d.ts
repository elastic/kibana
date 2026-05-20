import type { KibanaRequest } from '@kbn/core/server';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type { InfraEntityMetricsItem } from '../../data_registry/data_registry_types';
export declare function getToolHandler({ request, dataRegistry, start, end, limit, kqlFilter: kqlFilterValue, }: {
    request: KibanaRequest;
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
    start: string;
    end: string;
    limit: number;
    kqlFilter?: string;
}): Promise<{
    hosts: InfraEntityMetricsItem[];
    total: number;
}>;
