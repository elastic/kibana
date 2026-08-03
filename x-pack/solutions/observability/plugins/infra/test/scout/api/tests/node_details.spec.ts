/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, testData } from '../fixtures';

const { min, max } = testData.DATES['8.0.0'].pods_only;

interface NodeDetailsMetric {
  id: string;
  series: Array<{ id: string; data: Array<{ timestamp: number; value: number }> }>;
}

interface NodeDetailsResponse {
  metrics: NodeDetailsMetric[];
}

/**
 * `/api/metrics/node_details` (NodeDetailsRequestRT) does NOT accept a `schema`
 * field in its request body — the schema is resolved server-side from the source
 * configuration. Bodies below intentionally omit `schema`. See issue #264011.
 */
apiTest.describe(
  'API /api/metrics/node_details',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, esArchiver }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...testData.COMMON_HEADERS, ...cookieHeader };
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.PODS_ONLY_8_0);
    });

    apiTest('should basically work', async ({ apiClient }) => {
      const response = await apiClient.post('api/metrics/node_details', {
        headers,
        responseType: 'json',
        body: {
          sourceId: 'default',
          metrics: ['podCpuUsage'],
          timerange: {
            to: max,
            from: min,
            interval: '>=1m',
          },
          nodeId: '7d6d7955-f853-42b1-8613-11f52d0d2725',
          nodeType: 'pod',
        },
      });

      expect(response).toHaveStatusCode(200);
      const body = response.body as NodeDetailsResponse;
      expect(body.metrics).toHaveLength(1);
      const metric = body.metrics[0];
      expect(metric).toStrictEqual(expect.objectContaining({ id: 'podCpuUsage' }));
      expect(metric.series).toBeDefined();
      const series = metric.series[0];
      expect(series).toStrictEqual(expect.objectContaining({ id: 'cpu' }));
      expect(series.data).toBeDefined();
      const datapoint = series.data[series.data.length - 1];
      expect(datapoint).toStrictEqual(
        expect.objectContaining({ timestamp: 1642698890000, value: 0.544 })
      );
    });

    apiTest('should support multiple metrics', async ({ apiClient }) => {
      const response = await apiClient.post('api/metrics/node_details', {
        headers,
        responseType: 'json',
        body: {
          sourceId: 'default',
          metrics: ['podCpuUsage', 'podMemoryUsage'],
          timerange: {
            to: max,
            from: min,
            interval: '>=1m',
          },
          nodeId: '7d6d7955-f853-42b1-8613-11f52d0d2725',
          nodeType: 'pod',
        },
      });

      expect(response).toHaveStatusCode(200);
      const body = response.body as NodeDetailsResponse;
      expect(body.metrics).toHaveLength(2);
    });

    apiTest('should return multiple values for podOverview metric', async ({ apiClient }) => {
      const response = await apiClient.post('api/metrics/node_details', {
        headers,
        responseType: 'json',
        body: {
          sourceId: 'default',
          metrics: ['podOverview'],
          timerange: {
            to: max,
            from: min,
            interval: '>=1m',
          },
          nodeId: '7d6d7955-f853-42b1-8613-11f52d0d2725',
          nodeType: 'pod',
        },
      });

      expect(response).toHaveStatusCode(200);
      const body = response.body as NodeDetailsResponse;
      const podOverviewMetric = body.metrics.find((metric) => metric.id === 'podOverview');
      expect(podOverviewMetric?.series.length ?? 0).toBeGreaterThan(1);
    });

    apiTest('should use fallback when cpu.usage.limit.pct is missing', async ({ apiClient }) => {
      // This pod has no kubernetes.pod.cpu.usage.limit.pct field, so the CPU
      // aggregation should fall back to kubernetes.pod.cpu.usage.node.pct.
      const response = await apiClient.post('api/metrics/node_details', {
        headers,
        responseType: 'json',
        body: {
          sourceId: 'default',
          metrics: ['podCpuUsage'],
          timerange: {
            to: max,
            from: min,
            interval: '>=1m',
          },
          nodeId: 'fallback-test-pod-12345-67890-abcdef',
          nodeType: 'pod',
        },
      });

      expect(response).toHaveStatusCode(200);
      const body = response.body as NodeDetailsResponse;
      expect(body.metrics).toHaveLength(1);
      const metric = body.metrics[0];
      expect(metric).toStrictEqual(expect.objectContaining({ id: 'podCpuUsage' }));
      expect(metric.series).toBeDefined();
      const series = metric.series[0];
      expect(series).toStrictEqual(expect.objectContaining({ id: 'cpu' }));
      expect(series.data).toBeDefined();
      expect(series.data.length).toBeGreaterThan(0);

      // CPU values should be around 0.75 (from node.pct, not limit.pct).
      const datapoint = series.data[series.data.length - 1];
      expect(datapoint.value).toBeDefined();
      expect(datapoint.value).toBeGreaterThanOrEqual(0.6);
      expect(datapoint.value).toBeLessThanOrEqual(0.9);
    });
  }
);
