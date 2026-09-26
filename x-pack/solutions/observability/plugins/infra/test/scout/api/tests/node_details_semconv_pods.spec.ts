/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, RoleApiCredentials } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type {
  NodeDetailsDataSeries,
  NodeDetailsMetricData,
  NodeDetailsMetricDataResponse,
  NodeDetailsRequest,
} from '../../../../common/http_api/node_details_api';
import { apiTest, generatePodsData, generateSemconvPodsData, testData } from '../fixtures';

const POD_WITH_LIMITS = testData.SEMCONV_PODS[0];
const POD_WITHOUT_LIMITS = testData.SEMCONV_PODS[1];
const SEMCONV_CPU_WITH_LIMIT = 0.46;
const SEMCONV_CPU_WITHOUT_LIMIT = 0.32;
const SEMCONV_MEMORY_WITH_LIMIT = 0.55;
// Matches SemconvPod network counters (`NETWORK_IO_STEP` every 30s generator tick).
const SEMCONV_NETWORK_IO_STEP = 100_000;
const SEMCONV_NETWORK_GENERATOR_INTERVAL_SEC = 30;
const SEMCONV_NETWORK_BYTES_PER_SEC =
  SEMCONV_NETWORK_IO_STEP / SEMCONV_NETWORK_GENERATOR_INTERVAL_SEC;

const lastNonZeroPoints = (points: NodeDetailsDataSeries['data']): number | undefined => {
  for (let i = points.length - 1; i >= 0; i--) {
    const value = points[i]?.value;
    if (typeof value === 'number' && value !== 0) {
      return value;
    }
  }
  return undefined;
};

const lastNonZero = (metric: NodeDetailsMetricData | undefined): number | undefined => {
  return lastNonZeroPoints(metric?.series[0]?.data ?? []);
};

const lastNonZeroSeries = (
  metric: NodeDetailsMetricData | undefined,
  seriesId: string
): number | undefined => {
  const series = metric?.series.find((candidate) => candidate.id === seriesId);
  return lastNonZeroPoints(series?.data ?? []);
};

apiTest.describe(
  'API /api/metrics/node_details (semconv pods)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    const from = new Date(testData.SEMCONV_PODS_DATA_FROM).getTime();
    const to = new Date(testData.SEMCONV_PODS_DATA_TO).getTime();

    apiTest.beforeAll(async ({ requestAuth, infraSynthtraceEsClient }) => {
      const adminApiKey: RoleApiCredentials = await requestAuth.getApiKey('admin');
      headers = { ...adminApiKey.apiKeyHeader, ...testData.COMMON_HEADERS };

      await infraSynthtraceEsClient.clean();
      await infraSynthtraceEsClient.index(
        generateSemconvPodsData({
          from: testData.SEMCONV_PODS_DATA_FROM,
          to: testData.SEMCONV_PODS_DATA_TO,
          pods: testData.SEMCONV_PODS,
        })
      );
      await infraSynthtraceEsClient.index(
        generatePodsData({
          from: testData.SEMCONV_PODS_DATA_FROM,
          to: testData.SEMCONV_PODS_DATA_TO,
          count: 1,
        })
      );
    });

    apiTest.afterAll(async ({ infraSynthtraceEsClient }) => {
      await infraSynthtraceEsClient.clean();
    });

    const fetchNodeDetails = async (apiClient: ApiClientFixture, body: NodeDetailsRequest) => {
      return apiClient.post('api/metrics/node_details', {
        headers,
        responseType: 'json',
        body,
      });
    };

    const requestFor = (
      nodeId: string,
      metrics: NodeDetailsRequest['metrics'],
      schema?: NodeDetailsRequest['schema']
    ): NodeDetailsRequest => ({
      sourceId: 'default',
      nodeType: 'pod',
      nodeId,
      metrics,
      timerange: { from, to, interval: '>=1m' },
      ...(schema ? { schema } : {}),
    });

    apiTest('returns kubeletstats charts for an OpenTelemetry pod', async ({ apiClient }) => {
      const response = await fetchNodeDetails(
        apiClient,
        requestFor(
          POD_WITH_LIMITS.uid,
          ['podOverview', 'podCpuUsage', 'podMemoryUsage', 'podNetworkTraffic'],
          'semconv'
        )
      );

      expect(response).toHaveStatusCode(200);
      const { metrics } = response.body as NodeDetailsMetricDataResponse;
      expect(metrics.map((metric) => metric.id).sort()).toStrictEqual(
        ['podCpuUsage', 'podMemoryUsage', 'podNetworkTraffic', 'podOverview'].sort()
      );

      const cpu = metrics.find((metric) => metric.id === 'podCpuUsage');
      const cpuValue = lastNonZero(cpu);
      expect(cpuValue).toBeDefined();
      expect(Number(cpuValue?.toFixed(2))).toBe(SEMCONV_CPU_WITH_LIMIT);

      const memoryValue = lastNonZero(metrics.find((metric) => metric.id === 'podMemoryUsage'));
      expect(memoryValue).toBeDefined();
      expect(Number(memoryValue?.toFixed(2))).toBe(SEMCONV_MEMORY_WITH_LIMIT);

      const network = metrics.find((metric) => metric.id === 'podNetworkTraffic');
      const networkRx = lastNonZeroSeries(network, 'rx');
      const networkTx = lastNonZeroSeries(network, 'tx');
      expect(networkRx).toBeDefined();
      expect(networkTx).toBeDefined();
      expect(networkRx).toBeCloseTo(SEMCONV_NETWORK_BYTES_PER_SEC, 2);
      expect(networkTx).toBeCloseTo(SEMCONV_NETWORK_BYTES_PER_SEC, 2);

      const overviewRx = metrics
        .find((metric) => metric.id === 'podOverview')
        ?.series.find((series) => series.id === 'rx');
      expect(overviewRx?.data.some((point) => (point.value ?? 0) > 0)).toBe(true);
    });

    apiTest('falls back to node utilization when a limit is absent', async ({ apiClient }) => {
      const response = await fetchNodeDetails(
        apiClient,
        requestFor(POD_WITHOUT_LIMITS.uid, ['podCpuUsage'], 'semconv')
      );

      expect(response).toHaveStatusCode(200);
      const { metrics } = response.body as NodeDetailsMetricDataResponse;
      const cpuValue = lastNonZero(metrics.find((metric) => metric.id === 'podCpuUsage'));
      expect(cpuValue).toBeDefined();
      expect(Number(cpuValue?.toFixed(2))).toBe(SEMCONV_CPU_WITHOUT_LIMIT);
    });

    apiTest('does not find an OpenTelemetry pod on the default schema', async ({ apiClient }) => {
      const response = await fetchNodeDetails(
        apiClient,
        requestFor(POD_WITH_LIMITS.uid, ['podCpuUsage'])
      );

      expect(response).toHaveStatusCode(500);
      expect(response.body).toMatchObject({
        message: `${POD_WITH_LIMITS.uid} does not exist.`,
      });
    });

    apiTest('keeps an Elastic Common Schema pod on the default path', async ({ apiClient }) => {
      const response = await fetchNodeDetails(apiClient, requestFor('pod-0', ['podCpuUsage']));

      expect(response).toHaveStatusCode(200);
      const { metrics } = response.body as NodeDetailsMetricDataResponse;
      expect(metrics[0]?.id).toBe('podCpuUsage');
      expect(metrics[0]?.series[0]?.data.length).toBeGreaterThan(0);
    });
  }
);
