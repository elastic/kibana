/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMetricsExplorerViewsClientMock } from './metrics_explorer_views_client.mock';
import type { MetricsExplorerViewsServiceSetup, MetricsExplorerViewsServiceStart } from './types';

export const createMetricsExplorerViewsServiceSetupMock =
  (): jest.Mocked<MetricsExplorerViewsServiceSetup> => {};

export const createMetricsExplorerViewsServiceStartMock =
  (): jest.Mocked<MetricsExplorerViewsServiceStart> => ({
    getClient: jest.fn((_savedObjectsClient: any) => createMetricsExplorerViewsClientMock()),
    getScopedClient: jest.fn((_request: any) => createMetricsExplorerViewsClientMock()),
  });
