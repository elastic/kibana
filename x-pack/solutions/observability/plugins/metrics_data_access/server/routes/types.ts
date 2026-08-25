/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandlerContextBase } from '@kbn/core-http-server';
import type { MetricsDataClient } from '../client';

export interface SetupRouteOptions<T extends RequestHandlerContextBase> {
  router: IRouter<T>;
  metricsClient: MetricsDataClient;
}
