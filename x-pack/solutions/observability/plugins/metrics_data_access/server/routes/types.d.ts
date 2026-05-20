import type { IRouter, RequestHandlerContextBase } from '@kbn/core-http-server';
import type { MetricsDataClient } from '../client';
export interface SetupRouteOptions<T extends RequestHandlerContextBase> {
    router: IRouter<T>;
    metricsClient: MetricsDataClient;
}
