import type { PluginInitializerContext } from '@kbn/core/server';
export type { ObservabilityAgentBuilderPluginSetup, ObservabilityAgentBuilderPluginStart, ObservabilityAgentBuilderPluginSetupDependencies, ObservabilityAgentBuilderPluginStartDependencies, } from './types';
export type { ObservabilityAgentBuilderServerRouteRepository } from './routes/get_global_observability_agent_builder_route_repository';
export declare const plugin: (initializerContext: PluginInitializerContext) => Promise<import("./plugin").ObservabilityAgentBuilderPlugin>;
