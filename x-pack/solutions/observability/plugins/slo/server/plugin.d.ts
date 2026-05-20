import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { SLOPluginSetupDependencies, SLOPluginStartDependencies, SLOServerSetup, SLOServerStart } from './types';
export declare class SLOPlugin implements Plugin<SLOServerSetup, SLOServerStart, SLOPluginSetupDependencies, SLOPluginStartDependencies> {
    private readonly initContext;
    private readonly logger;
    private readonly config;
    private readonly isServerless;
    private readonly isDev;
    private orphanSummaryCleanupTask?;
    private tempSummaryCleanupTask?;
    private staleInstancesCleanupTask?;
    private compositeSloSummaryTask?;
    constructor(initContext: PluginInitializerContext);
    setup(core: CoreSetup<SLOPluginStartDependencies, SLOServerStart>, plugins: SLOPluginSetupDependencies): SLOServerSetup;
    start(core: CoreStart, plugins: SLOPluginStartDependencies): SLOServerStart;
}
