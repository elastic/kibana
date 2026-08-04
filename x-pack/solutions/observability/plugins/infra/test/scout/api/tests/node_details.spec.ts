/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type {
  NodeDetailsMetricDataResponse,
  NodeDetailsRequest,
} from '../../../../common/http_api/node_details_api';
import { apiTest, testData } from '../fixtures';

const NODE_DETAILS_ENDPOINT = 'api/metrics/node_details';
const POD_ID = '7d6d7955-f853-42b1-8613-11f52d0d2725';

const { min, max } = testData.DATES['8.0.0'].pods_only;

/**
 * `/api/metrics/node_details` (`NodeDetailsRequestRT`) does NOT accept a `schema` field in
 * its request body — the schema is resolved server-side from the source configuration. The
 * bodies below intentionally omit `schema`; this is documented behavior, not a missed audit.
 * See issue #264011.
 */
apiTest.describe(
  'API /api/metrics/node_details',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, esArchiver }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...testData.COMMON_HEADERS, ...cookieHeader };
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.PODS_ONLY_8_0_0);
    });

    const fetchNodeDetails = async (
      apiClient: ApiClientFixture,
      body: NodeDetailsRequest
    ): Promise<NodeDetailsMetricDataResponse> => {
      const response = await apiClient.post(NODE_DETAILS_ENDPOINT, {
        headers,
        responseType: 'json',
        body,
      });

      expect(response).toHaveStatusCode(200);
      return response.body as NodeDetailsMetricDataResponse;
    };

    const podCpuUsageRequest = (nodeId: string): NodeDetailsRequest => ({
      sourceId: 'default',
      metrics: ['podCpuUsage'],
      timerange: { to: max, from: min, interval: '>=1m' },
      nodeId,
      nodeType: 'pod',
    });

    apiTest('should basically work', async ({ apiClient }) => {
      const { metrics } = await fetchNodeDetails(apiClient, podCpuUsageRequest(POD_ID));

      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({ id: 'podCpuUsage' });

      const [series] = metrics[0].series;
      expect(series).toMatchObject({ id: 'cpu' });
      expect(series.data.at(-1)).toMatchObject({ timestamp: 1642698890000, value: 0.544 });
    });

    apiTest('should support multiple metrics', async ({ apiClient }) => {
      const { metrics } = await fetchNodeDetails(apiClient, {
        sourceId: 'default',
        metrics: ['podCpuUsage', 'podMemoryUsage'],
        timerange: { to: max, from: min, interval: '>=1m' },
        nodeId: POD_ID,
        nodeType: 'pod',
      });

      expect(metrics).toHaveLength(2);
    });

    apiTest('should return multiple values for podOverview metric', async ({ apiClient }) => {
      const { metrics } = await fetchNodeDetails(apiClient, {
        sourceId: 'default',
        metrics: ['podOverview'],
        timerange: { to: max, from: min, interval: '>=1m' },
        nodeId: POD_ID,
        nodeType: 'pod',
      });

      const podOverviewMetric = metrics.find((metric) => metric.id === 'podOverview');
      expect(podOverviewMetric?.series.length ?? 0).toBeGreaterThan(1);
    });

    apiTest('should use fallback when cpu.usage.limit.pct is missing', async ({ apiClient }) => {
      // This pod has no `kubernetes.pod.cpu.usage.limit.pct`, so the CPU aggregation must
      // fall back to `kubernetes.pod.cpu.usage.node.pct`, which yields values around 0.75.
      const { metrics } = await fetchNodeDetails(
        apiClient,
        podCpuUsageRequest('fallback-test-pod-12345-67890-abcdef')
      );

      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({ id: 'podCpuUsage' });

      const [series] = metrics[0].series;
      expect(series).toMatchObject({ id: 'cpu' });
      expect(series.data.length).toBeGreaterThan(0);

      const datapoint = series.data.at(-1);
      expect(datapoint?.value).toBeGreaterThanOrEqual(0.6);
      expect(datapoint?.value).toBeLessThanOrEqual(0.9);
    });
  }
);
