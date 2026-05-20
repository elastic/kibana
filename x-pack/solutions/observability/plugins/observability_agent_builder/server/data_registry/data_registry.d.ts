import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderDataRegistryTypes } from './data_registry_types';
export declare class ObservabilityAgentBuilderDataRegistry {
    private readonly logger;
    private readonly providers;
    constructor(logger: Logger);
    registerDataProvider<K extends keyof ObservabilityAgentBuilderDataRegistryTypes>(id: K, provider: ObservabilityAgentBuilderDataRegistryTypes[K]): void;
    getData<K extends keyof ObservabilityAgentBuilderDataRegistryTypes>(id: K, params: Parameters<ObservabilityAgentBuilderDataRegistryTypes[K]>[0]): Promise<ReturnType<ObservabilityAgentBuilderDataRegistryTypes[K]> | undefined>;
}
