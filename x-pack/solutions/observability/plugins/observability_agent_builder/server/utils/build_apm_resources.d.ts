import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import type { APMEventClient} from '@kbn/apm-data-access-plugin/server';
import { type ApmDataAccessServices } from '@kbn/apm-data-access-plugin/server';
import type { ObservabilityAgentBuilderPluginSetupDependencies, ObservabilityAgentBuilderPluginStart, ObservabilityAgentBuilderPluginStartDependencies } from '../types';
export interface ApmResources {
    apmEventClient: APMEventClient;
    apmDataAccessServices: ApmDataAccessServices;
}
export declare function buildApmResources({ core, plugins, request, logger, }: {
    core: CoreSetup<ObservabilityAgentBuilderPluginStartDependencies, ObservabilityAgentBuilderPluginStart>;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    request: KibanaRequest;
    logger: Logger;
}): Promise<ApmResources>;
