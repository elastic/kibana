import type { AppMountParameters, CoreSetup, CoreStart } from '@kbn/core/public';
import type { Services } from './services';
import type { ProfilingPluginPublicSetupDeps, ProfilingPluginPublicStartDeps } from './types';
interface Props {
    profilingFetchServices: Services;
    coreStart: CoreStart;
    coreSetup: CoreSetup;
    pluginsStart: ProfilingPluginPublicStartDeps;
    pluginsSetup: ProfilingPluginPublicSetupDeps;
    theme$: AppMountParameters['theme$'];
    history: AppMountParameters['history'];
    setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}
export declare const renderApp: (props: Props, element: AppMountParameters["element"]) => () => boolean;
export {};
