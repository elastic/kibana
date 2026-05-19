import type { IKibanaResponse } from '@kbn/core/server';
import type { RouteContext, UMRestApiRouteFactory, UptimeRouteContext } from '../types';
import type { ScreenshotBlockDoc } from '../../../../common/runtime_types/ping/synthetics';
export declare const createJourneyScreenshotBlocksRoute: UMRestApiRouteFactory<ScreenshotBlockDoc[]>;
export declare const journeyScreenshotBlocksHandler: ({ response, request, uptimeEsClient, }: RouteContext | UptimeRouteContext) => Promise<IKibanaResponse<ScreenshotBlockDoc[]>>;
