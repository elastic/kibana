import type { UMServerLibs } from '../lib/lib';
import type { UptimeRoute, UMRestApiRouteFactory } from './types';
export declare const createRouteWithAuth: (libs: UMServerLibs, routeCreator: UMRestApiRouteFactory) => UptimeRoute;
