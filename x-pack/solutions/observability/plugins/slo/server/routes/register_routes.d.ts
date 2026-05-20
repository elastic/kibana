import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ServerRoute } from '@kbn/server-route-repository';
import type { SLORoutesDependencies } from './types';
interface RegisterRoutes {
    core: CoreSetup;
    repository: Record<string, ServerRoute<string, any, any, any, any>>;
    logger: Logger;
    dependencies: SLORoutesDependencies;
    isDev: boolean;
}
export declare function registerServerRoutes({ repository, core, logger, dependencies, isDev, }: RegisterRoutes): void;
export {};
