import type { UMRestApiRouteFactory } from './types';
export type * from './types';
export { createRouteWithAuth } from './create_route_with_auth';
export { uptimeRouteWrapper } from './uptime_route_wrapper';
export declare const legacyUptimeRestApiRoutes: UMRestApiRouteFactory[];
export declare const legacyUptimePublicRestApiRoutes: UMRestApiRouteFactory[];
