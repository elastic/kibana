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
  'API /api/metrics/snapshot (8.0.0)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    const { min, max } = testData.DATES['8.0.0'].logs_and_metrics;

    apiTest.beforeAll(async ({ samlAuth, esArchiver }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...testData.COMMON_HEADERS, ...cookieHeader };
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGS_AND_METRICS_8_0);
    });

    apiTest(
      "should use the id for the label when the name doesn't exist",
      async ({ apiClient }) => {
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
            nodeType: 'pod',
            schema: 'ecs',
            groupBy: [],
            includeTimeseries: false,
          },
        });

        expect(response).toHaveStatusCode(200);
        const snapshot = response.body as SnapshotNodeResponse;
        expect(snapshot.nodes).toBeDefined();

        const { nodes } = snapshot;
        expect(nodes).toHaveLength(65);
        const firstNode = nodes[0];
        expect(firstNode.path).toBeDefined();
        expect(firstNode.path).toHaveLength(1);
        expect(firstNode.path[0].value).toBe('00597dd7-a348-11e9-9a96-42010a84004d');
        expect(firstNode.path[0].label).toBe('00597dd7-a348-11e9-9a96-42010a84004d');
      }
    );

    apiTest('should have an id and label', async ({ apiClient }) => {
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
          includeTimeseries: false,
        },
      });

      expect(response).toHaveStatusCode(200);
      const snapshot = response.body as SnapshotNodeResponse;
      expect(snapshot.nodes).toBeDefined();

      const { nodes } = snapshot;
      expect(nodes).toHaveLength(135);
      const firstNode = nodes[0];
      expect(firstNode.path).toBeDefined();
      expect(firstNode.path).toHaveLength(1);
      expect(firstNode.path[0].value).toBe(
        '01078c21eef4194b0b96253c7c6c32796aba66e3f3f37e26ac97d1dff3e2e91a'
      );
      expect(firstNode.path[0].label).toBe(
        'k8s_prometheus-to-sd-exporter_fluentd-gcp-v3.2.0-wcmm4_kube-system_b214d17a-9ae0-11e9-9a96-42010a84004d_0'
      );
    });

    apiTest('should not return timeseries data - with groupBy', async ({ apiClient }) => {
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
          groupBy: [{ field: 'host.name' }],
          includeTimeseries: false,
        },
      });

      const expected = {
        name: 'cpu',
        value: 0.44708333333333333,
        max: 0.44708333333333333,
        avg: 0.44708333333333333,
      };

      expect(response).toHaveStatusCode(200);
      const snapshot = response.body as SnapshotNodeResponse;
      expect(snapshot.nodes).toBeDefined();

      const { nodes } = snapshot;
      expect(nodes).toHaveLength(3);
      const firstNode = nodes[0];
      expect(firstNode.path).toBeDefined();
      expect(firstNode.path).toHaveLength(2);
      expect(firstNode.path[0].value).toBe('gke-observability-8--observability-8--bc1afd95-f0zc');
      expect(firstNode.path[1].value).toBe('gke-observability-8--observability-8--bc1afd95-f0zc');
      expect(firstNode.metrics).toBeDefined();
      expect(firstNode.metrics).toStrictEqual([expected]);
    });

    apiTest('should not return timeseries data - without groupBy', async ({ apiClient }) => {
      // NOTE: `schema` is intentionally omitted here. The host `nodeFilter`
      // (see metrics_data_access `inventory_models/host/index.ts`) returns
      // `[]` when `schema` is undefined and applies an ECS module filter
      // when `schema: 'ecs'`. With `groupBy: null` the request aggregates
      // across ALL hosts in the archive, so adding the ECS module filter
      // excludes non-system docs and shifts the pinned `max`/`avg` values.
      // Other tests in this file pin `schema: 'ecs'` because their
      // assertions are per-host and unaffected by the filter.
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
          groupBy: null,
          includeTimeseries: false,
        },
      });

      const expected = {
        name: 'cpu',
        value: null,
        max: 0.47105555555555556,
        avg: 0.47105555555555556,
      };

      expect(response).toHaveStatusCode(200);
      const snapshot = response.body as SnapshotNodeResponse;
      expect(snapshot.nodes).toBeDefined();

      const { nodes } = snapshot;
      expect(nodes).toHaveLength(1);
      const firstNode = nodes[0];
      expect(firstNode.path).toBeDefined();
      expect(firstNode.path).toHaveLength(1);
      expect(firstNode.path[0].value).toBe('*');
      expect(firstNode.metrics).toBeDefined();
      expect(firstNode.metrics).toStrictEqual([expected]);
    });
  }
);
