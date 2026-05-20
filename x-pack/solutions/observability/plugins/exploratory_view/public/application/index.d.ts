import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { ExploratoryViewPublicPluginsStart } from '../plugin';
export type StartServices = Pick<CoreStart, 'analytics' | 'i18n' | 'theme'>;
export declare const renderApp: ({ core, appMountParameters, plugins, usageCollection, isDev, }: {
    core: CoreStart;
    appMountParameters: AppMountParameters;
    plugins: ExploratoryViewPublicPluginsStart;
    usageCollection: UsageCollectionSetup;
    isDev?: boolean;
}) => () => void;
