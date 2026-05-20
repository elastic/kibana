import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { SetupRouteOptions } from '../types';
export declare function initMetricIndicesRoute<T extends RequestHandlerContext>({ router, metricsClient, }: SetupRouteOptions<T>): void;
