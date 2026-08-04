/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { SnapshotNodeResponse } from '../../../../common/http_api/snapshot_api';
import { apiTest, testData } from '../fixtures';

apiTest.describe(
  'API /api/metrics/snapshot (6.6.0)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    const { min, max } = testData.DATES['6.6.0'].docker;

    apiTest.beforeAll(async ({ samlAuth, esArchiver }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...testData.COMMON_HEADERS, ...cookieHeader };
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.DOCKER_6_6_0);
    });

    apiTest('should basically work', async ({ apiClient }) => {
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
          metrics: [{ type: 'cpu' }],
          nodeType: 'container',
          schema: 'ecs',
          groupBy: [],
          includeTimeseries: true,
        },
      });

      expect(response).toHaveStatusCode(200);
      const snapshot = response.body as SnapshotNodeResponse;
      expect(snapshot.nodes).toBeDefined();

      const { nodes } = snapshot;
      expect(nodes).toHaveLength(5);
      const firstNode = nodes[0];
      expect(firstNode.path).toBeDefined();
      expect(firstNode.path).toHaveLength(1);
      expect(firstNode.path[0].value).toBe(
        '242fddb9d376bbf0e38025d81764847ee5ec0308adfa095918fd3266f9d06c6a'
      );
      expect(firstNode.metrics).toBeDefined();
      expect(firstNode.metrics).toStrictEqual([
        {
          name: 'cpu',
          value: 0,
          max: 0,
          avg: 0,
          timeseries: {
            columns: [
              {
                name: 'timestamp',
                type: 'date',
              },
              {
                name: 'metric_0',
                type: 'number',
              },
            ],
            id: 'cpu',
            rows: [
              {
                metric_0: 0,
                timestamp: 1547578849952,
              },
              {
                metric_0: 0,
                timestamp: 1547578909952,
              },
              {
                metric_0: 0,
                timestamp: 1547578969952,
              },
              {
                metric_0: 0,
                timestamp: 1547579029952,
              },
            ],
          },
        },
      ]);
    });
  }
);
