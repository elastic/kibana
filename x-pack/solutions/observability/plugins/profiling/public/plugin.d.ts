import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { ProfilingPluginPublicSetupDeps, ProfilingPluginPublicStartDeps } from './types';
export type ProfilingPluginSetup = void;
export type ProfilingPluginStart = void;
export declare class ProfilingPlugin implements Plugin<ProfilingPluginSetup, ProfilingPluginStart, ProfilingPluginPublicSetupDeps, ProfilingPluginPublicStartDeps> {
    setup(coreSetup: CoreSetup<ProfilingPluginPublicStartDeps>, pluginsSetup: ProfilingPluginPublicSetupDeps): {};
    start(core: CoreStart): {};
    stop(): void;
}
