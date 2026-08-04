/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, testData } from '../fixtures';

apiTest.describe(
  'API /api/metrics/snapshot (request validation)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...testData.COMMON_HEADERS, ...cookieHeader };
    });

    apiTest('should return 400 when requesting more than 20 metrics', async ({ apiClient }) => {
      const { min, max } = testData.DATES['8.0.0'].logs_and_metrics;
      const response = await apiClient.post('api/metrics/snapshot', {
        headers,
        responseType: 'json',
        body: {
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '1m',
          },
          metrics: Array(21).fill({ type: 'cpu' }),
          nodeType: 'host',
          schema: 'ecs',
          groupBy: [{ field: 'service.type' }],
          includeTimeseries: true,
        },
      });

      expect(response).toHaveStatusCode(400);
    });
  }
);
