import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ObservabilityAgentBuilderPluginPublicSetup, ObservabilityAgentBuilderPluginSetupDependencies, ObservabilityAgentBuilderPluginPublicStart, ObservabilityAgentBuilderPluginStartDependencies } from './types';
export declare class ObservabilityAgentBuilderPlugin implements Plugin<ObservabilityAgentBuilderPluginPublicSetup, ObservabilityAgentBuilderPluginPublicStart, ObservabilityAgentBuilderPluginSetupDependencies, ObservabilityAgentBuilderPluginStartDependencies> {
    constructor(initContext: PluginInitializerContext);
    setup(core: CoreSetup<ObservabilityAgentBuilderPluginStartDependencies, ObservabilityAgentBuilderPluginPublicStart>, plugins: ObservabilityAgentBuilderPluginSetupDependencies): ObservabilityAgentBuilderPluginPublicSetup;
    start(core: CoreStart, plugins: ObservabilityAgentBuilderPluginStartDependencies): ObservabilityAgentBuilderPluginPublicStart;
    stop(): void;
}
