import type { RouteContext, UMRestApiRouteFactory, UptimeRouteContext } from '../types';
export declare const createLastSuccessfulCheckRoute: UMRestApiRouteFactory;
export declare const getLastSuccessfulCheckScreenshot: ({ response, request, uptimeEsClient, }: RouteContext | UptimeRouteContext) => Promise<import("@kbn/core/server").IKibanaResponse<any>>;
