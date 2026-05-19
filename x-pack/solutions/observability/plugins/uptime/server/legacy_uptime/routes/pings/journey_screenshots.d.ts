import type { IKibanaResponse } from '@kbn/core-http-server';
import type { RefResult } from '../../../../common/runtime_types/ping/synthetics';
import type { RouteContext, UMRestApiRouteFactory, UptimeRouteContext } from '../types';
export interface ClientContract {
    screenshotRef: RefResult;
}
export declare const createJourneyScreenshotRoute: UMRestApiRouteFactory<ClientContract>;
export declare const journeyScreenshotHandler: ({ response, request, uptimeEsClient, }: RouteContext | UptimeRouteContext) => Promise<IKibanaResponse<ClientContract>>;
