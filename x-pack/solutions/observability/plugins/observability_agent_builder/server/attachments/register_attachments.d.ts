import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../types';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';
export declare function registerAttachments({ core, plugins, logger, dataRegistry, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    logger: Logger;
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
}): Promise<void>;
