import type { CoreStart, CoreSetup } from '@kbn/core/public';
import type { Services } from '../../../services';
import type { ProfilingPluginPublicSetupDeps, ProfilingPluginPublicStartDeps } from '../../../types';
export interface ProfilingDependencies {
    start: {
        core: CoreStart;
    } & ProfilingPluginPublicStartDeps;
    setup: {
        core: CoreSetup;
    } & ProfilingPluginPublicSetupDeps;
    services: Services;
}
export declare const ProfilingDependenciesContext: import("react").Context<ProfilingDependencies | undefined>;
export declare const ProfilingDependenciesContextProvider: import("react").Provider<ProfilingDependencies | undefined>;
