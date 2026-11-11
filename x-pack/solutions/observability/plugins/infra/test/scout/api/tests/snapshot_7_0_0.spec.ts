/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type {
  SnapshotMetricInput,
  SnapshotNodeResponse,
} from '../../../../common/http_api/snapshot_api';
import { apiTest, testData } from '../fixtures';

apiTest.describe(
  'API /api/metrics/snapshot (7.0.0)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    const { min, max } = testData.DATES['7.0.0'].hosts;

    apiTest.beforeAll(async ({ requestAuth, esArchiver }) => {
      const adminApiKey: RoleApiCredentials = await requestAuth.getApiKey('admin');
      headers = { ...adminApiKey.apiKeyHeader, ...testData.COMMON_HEADERS };
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.HOSTS_7_0_0);
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
          nodeType: 'host',
          schema: 'ecs',
          groupBy: [],
          includeTimeseries: true,
        },
      });

      expect(response).toHaveStatusCode(200);
      const snapshot = response.body as SnapshotNodeResponse;
      expect(snapshot.nodes).toBeDefined();

      const { nodes } = snapshot;
      expect(nodes).toHaveLength(1);
      const firstNode = nodes[0];
      expect(firstNode.path).toBeDefined();
      expect(firstNode.path).toHaveLength(1);
      expect(firstNode.path[0].value).toBe('demo-stack-mysql-01');
      expect(firstNode.path[0].label).toBe('demo-stack-mysql-01');
      expect(firstNode.metrics).toBeDefined();
      expect(firstNode.metrics).toStrictEqual([
        {
          name: 'cpu',
          value: 0.0032,
          max: 0.0038333333333333336,
          avg: 0.003341666666666667,
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
                metric_0: 0.003166666666666667,
                timestamp: 1547571590967,
              },
              {
                metric_0: 0.003166666666666667,
                timestamp: 1547571650967,
              },
              {
                metric_0: 0.0038333333333333336,
                timestamp: 1547571710967,
              },
              {
                metric_0: 0.0032,
                timestamp: 1547571770967,
              },
            ],
          },
        },
      ]);
    });

    apiTest(
      'should allow for overrides for interval and ignoring lookback',
      async ({ apiClient }) => {
        const response = await apiClient.post('api/metrics/snapshot', {
          headers,
          responseType: 'json',
          body: {
            sourceId: 'default',
            timerange: {
              to: max,
              from: min,
              interval: '10s',
              forceInterval: true,
              ignoreLookback: true,
            },
            metrics: [{ type: 'cpu' }],
            nodeType: 'host',
            schema: 'ecs',
            groupBy: [],
            includeTimeseries: true,
          },
        });

        expect(response).toHaveStatusCode(200);
        const snapshot = response.body as SnapshotNodeResponse;
        expect(snapshot.nodes).toBeDefined();

        const { nodes } = snapshot;
        expect(nodes).toHaveLength(1);
        const firstNode = nodes[0];
        expect(firstNode.path).toBeDefined();
        expect(firstNode.path).toHaveLength(1);
        expect(firstNode.path[0].value).toBe('demo-stack-mysql-01');
        expect(firstNode.path[0].label).toBe('demo-stack-mysql-01');
        expect(firstNode.metrics).toBeDefined();
        expect(firstNode.metrics[0].timeseries).toBeDefined();
        expect(firstNode.metrics[0].timeseries?.rows).toHaveLength(56);
        const rows = firstNode.metrics[0].timeseries?.rows;
        const rowInterval = (rows?.[1]?.timestamp || 0) - (rows?.[0]?.timestamp || 0);
        expect(rowInterval).toBe(10000);
      }
    );

    apiTest('should allow for overrides for lookback', async ({ apiClient }) => {
      const response = await apiClient.post('api/metrics/snapshot', {
        headers,
        responseType: 'json',
        body: {
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '1m',
            lookbackSize: 6,
          },
          metrics: [{ type: 'cpu' }],
          nodeType: 'host',
          schema: 'ecs',
          groupBy: [],
          includeTimeseries: true,
        },
      });

      expect(response).toHaveStatusCode(200);
      const snapshot = response.body as SnapshotNodeResponse;
      expect(snapshot.nodes).toBeDefined();

      const { nodes } = snapshot;
      expect(nodes).toHaveLength(1);
      const firstNode = nodes[0];
      expect(firstNode.path).toBeDefined();
      expect(firstNode.path).toHaveLength(1);
      expect(firstNode.path[0].value).toBe('demo-stack-mysql-01');
      expect(firstNode.path[0].label).toBe('demo-stack-mysql-01');
      expect(firstNode.metrics).toBeDefined();
      expect(firstNode.metrics[0].timeseries).toBeDefined();
      expect(firstNode.metrics[0].timeseries?.rows).toHaveLength(5);
    });

    apiTest('should work with custom metrics', async ({ apiClient }) => {
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
          metrics: [
            {
              type: 'custom',
              field: 'system.cpu.user.pct',
              aggregation: 'avg',
              id: '1',
            },
          ] as SnapshotMetricInput[],
          nodeType: 'host',
          schema: 'ecs',
          groupBy: [],
          includeTimeseries: true,
        },
      });

      expect(response).toHaveStatusCode(200);
      const snapshot = response.body as SnapshotNodeResponse;
      const { nodes } = snapshot;
      expect(nodes).toHaveLength(1);
      const firstNode = nodes[0];
      expect(firstNode.path).toBeDefined();
      expect(firstNode.path).toHaveLength(1);
      expect(firstNode.path[0].value).toBe('demo-stack-mysql-01');
      expect(firstNode.path[0].label).toBe('demo-stack-mysql-01');
      expect(firstNode.metrics).toBeDefined();
      expect(firstNode.metrics).toStrictEqual([
        {
          name: 'custom_0',
          value: 0.0016,
          max: 0.0018333333333333333,
          avg: 0.00165,
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
            id: 'custom_0',
            rows: [
              {
                metric_0: 0.0016666666666666668,
                timestamp: 1547571590967,
              },
              {
                metric_0: 0.0015000000000000002,
                timestamp: 1547571650967,
              },
              {
                metric_0: 0.0018333333333333333,
                timestamp: 1547571710967,
              },
              {
                metric_0: 0.0016,
                timestamp: 1547571770967,
              },
            ],
          },
        },
      ]);
    });

    apiTest('should basically work with 1 grouping', async ({ apiClient }) => {
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
          nodeType: 'host',
          schema: 'ecs',
          groupBy: [{ field: 'cloud.availability_zone' }],
          includeTimeseries: false,
        },
      });

      expect(response).toHaveStatusCode(200);
      const snapshot = response.body as SnapshotNodeResponse;
      expect(snapshot.nodes).toBeDefined();

      const { nodes } = snapshot;
      expect(nodes).toHaveLength(1);
      const firstNode = nodes[0];
      expect(firstNode.path).toBeDefined();
      expect(firstNode.path).toHaveLength(2);
      expect(firstNode.path[0].value).toBe('virtualbox');
      expect(firstNode.path[firstNode.path.length - 1].value).toBe('demo-stack-mysql-01');
    });

    apiTest('should basically work with 2 groupings', async ({ apiClient }) => {
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
          nodeType: 'host',
          schema: 'ecs',
          groupBy: [{ field: 'cloud.provider' }, { field: 'cloud.availability_zone' }],
          includeTimeseries: false,
        },
      });

      expect(response).toHaveStatusCode(200);
      const snapshot = response.body as SnapshotNodeResponse;
      expect(snapshot.nodes).toBeDefined();

      const { nodes } = snapshot;
      expect(nodes).toHaveLength(1);
      const firstNode = nodes[0];
      expect(firstNode.path).toBeDefined();
      expect(firstNode.path).toHaveLength(3);
      expect(firstNode.path[0].value).toBe('vagrant');
      expect(firstNode.path[1].value).toBe('virtualbox');
      expect(firstNode.path[firstNode.path.length - 1].value).toBe('demo-stack-mysql-01');
    });

    apiTest(
      'should show metrics for all nodes when grouping by service type',
      async ({ apiClient }) => {
        // NOTE: `schema` is intentionally omitted. The host `nodeFilter`
        // (see metrics_data_access `inventory_models/host/index.ts`) returns
        // `[]` when `schema` is undefined and adds an ECS module filter
        // (`event.module: system` OR `metricset.module: system`) when
        // `schema: 'ecs'`. This test asserts both `service.type: mysql` and
        // `service.type: system` groups exist; the mysql-module docs do not
        // satisfy the ECS module filter, so pinning `schema: 'ecs'` here
        // would drop the mysql group and break the assertion.
        // See issue #264011.
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
            nodeType: 'host',
            groupBy: [{ field: 'service.type' }],
            includeTimeseries: true,
          },
        });

        const expected = {
          name: 'cpu',
          value: 0.0032,
          max: 0.0038333333333333336,
          avg: 0.003341666666666667,
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
                metric_0: 0.003166666666666667,
                timestamp: 1547571590967,
              },
              {
                metric_0: 0.003166666666666667,
                timestamp: 1547571650967,
              },
              {
                metric_0: 0.0038333333333333336,
                timestamp: 1547571710967,
              },
              {
                metric_0: 0.0032,
                timestamp: 1547571770967,
              },
            ],
          },
        };

        expect(response).toHaveStatusCode(200);
        const snapshot = response.body as SnapshotNodeResponse;
        expect(snapshot.nodes).toBeDefined();

        const { nodes } = snapshot;
        expect(nodes).toHaveLength(2);
        const firstNode = nodes[0];
        expect(firstNode.path).toBeDefined();
        expect(firstNode.path).toHaveLength(2);
        expect(firstNode.path[0].value).toBe('mysql');
        expect(firstNode.path[1].value).toBe('demo-stack-mysql-01');
        expect(firstNode.metrics).toBeDefined();
        expect(firstNode.metrics).toStrictEqual([expected]);
        const secondNode = nodes[1];
        expect(secondNode.path).toBeDefined();
        expect(secondNode.path).toHaveLength(2);
        expect(secondNode.path[0].value).toBe('system');
        expect(secondNode.path[1].value).toBe('demo-stack-mysql-01');
        expect(secondNode.metrics).toBeDefined();
        expect(secondNode.metrics).toStrictEqual([expected]);
      }
    );
  }
);
