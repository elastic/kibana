/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type {
  FindMetricsExplorerViewResponsePayload,
  CreateMetricsExplorerViewResponsePayload,
  UpdateMetricsExplorerViewResponsePayload,
  GetMetricsExplorerViewResponsePayload,
} from '../../../common/http_api';
import type { MetricsExplorerViewAttributes } from '../../../common/metrics_explorer_views';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MetricsExplorerViewsServiceSetup {}

export interface MetricsExplorerViewsServiceStart {
  getClient: () => Promise<IMetricsExplorerViewsClient>;
}

export interface MetricsExplorerViewsServiceStartDeps {
  http: HttpStart;
}

export interface IMetricsExplorerViewsClient {
  findMetricsExplorerViews(): Promise<FindMetricsExplorerViewResponsePayload['data']>;
  getMetricsExplorerView(
    metricsExplorerViewId: string
  ): Promise<GetMetricsExplorerViewResponsePayload>;
  createMetricsExplorerView(
    metricsExplorerViewAttributes: Partial<MetricsExplorerViewAttributes>
  ): Promise<CreateMetricsExplorerViewResponsePayload>;
  updateMetricsExplorerView(
    metricsExplorerViewId: string,
    metricsExplorerViewAttributes: Partial<MetricsExplorerViewAttributes>
  ): Promise<UpdateMetricsExplorerViewResponsePayload>;
  deleteMetricsExplorerView(metricsExplorerViewId: string): Promise<null>;
}
