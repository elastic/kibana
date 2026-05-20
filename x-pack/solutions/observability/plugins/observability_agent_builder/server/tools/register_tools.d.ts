import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../types';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';
export declare const PLATFORM_TOOL_IDS: ("platform.core.list_indices" | "platform.core.get_index_mapping" | "platform.core.get_document_by_id" | "platform.core.product_documentation" | "platform.streams.sig_events.ki_search")[];
export declare const OBSERVABILITY_TOOL_IDS: string[];
export declare function registerTools({ core, plugins, dataRegistry, logger, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
    logger: Logger;
}): Promise<void>;
