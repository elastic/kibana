import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { ObservabilityAgentBuilderPluginSetup, ObservabilityAgentBuilderPluginSetupDependencies, ObservabilityAgentBuilderPluginStart, ObservabilityAgentBuilderPluginStartDependencies } from './types';
export declare class ObservabilityAgentBuilderPlugin implements Plugin<ObservabilityAgentBuilderPluginSetup, ObservabilityAgentBuilderPluginStart, ObservabilityAgentBuilderPluginSetupDependencies, ObservabilityAgentBuilderPluginStartDependencies> {
    private readonly logger;
    private readonly dataRegistry;
    constructor(initContext: PluginInitializerContext);
    setup(core: CoreSetup<ObservabilityAgentBuilderPluginStartDependencies, ObservabilityAgentBuilderPluginStart>, plugins: ObservabilityAgentBuilderPluginSetupDependencies): ObservabilityAgentBuilderPluginSetup;
    start(_core: CoreStart, _plugins: ObservabilityAgentBuilderPluginStartDependencies): ObservabilityAgentBuilderPluginStart;
    stop(): void;
}
