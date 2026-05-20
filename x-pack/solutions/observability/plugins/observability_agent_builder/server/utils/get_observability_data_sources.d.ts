import type { Logger } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../types';
export interface ObservabilityDataSources {
    apmIndexPatterns: APMIndices;
    logIndexPatterns: string[];
    metricIndexPatterns: string[];
    alertsIndexPattern: string[];
}
export declare function getObservabilityDataSources({ core, plugins, logger, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    logger: Logger;
}): Promise<ObservabilityDataSources>;
