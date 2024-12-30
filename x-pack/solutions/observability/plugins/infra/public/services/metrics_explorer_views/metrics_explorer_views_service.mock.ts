/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMetricsExplorerViewsClientMock } from './metrics_explorer_views_client.mock';
import { MetricsExplorerViewsServiceStart } from './types';

export const createMetricsExplorerViewsServiceStartMock = () => ({
  getClient: () => Promise.resolve(createMetricsExplorerViewsClientMock()),
});

export const _ensureTypeCompatibility = (): MetricsExplorerViewsServiceStart =>
  createMetricsExplorerViewsServiceStartMock();
