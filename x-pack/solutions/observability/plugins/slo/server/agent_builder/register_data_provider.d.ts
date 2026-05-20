import type { CoreSetup, Logger } from '@kbn/core/server';
import type { SLOPluginSetupDependencies, SLOPluginStartDependencies } from '../types';
export declare function registerDataProviders({ core, plugins, logger, }: {
    core: CoreSetup<SLOPluginStartDependencies>;
    plugins: SLOPluginSetupDependencies;
    logger: Logger;
}): void;
