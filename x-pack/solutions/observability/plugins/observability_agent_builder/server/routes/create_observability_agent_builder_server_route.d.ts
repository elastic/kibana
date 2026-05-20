import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository-utils';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../types';
export interface ObservabilityAgentBuilderRouteHandlerResources extends DefaultRouteHandlerResources {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
}
export declare const createObservabilityAgentBuilderServerRoute: import("@kbn/server-route-repository-utils/src/typings").CreateServerRouteFactory<ObservabilityAgentBuilderRouteHandlerResources, undefined>;
