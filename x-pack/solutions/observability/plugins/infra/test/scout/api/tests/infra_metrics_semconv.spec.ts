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
  GetInfraMetricsRequestBodyPayloadClient,
  GetInfraMetricsResponsePayload,
} from '../../../../common/http_api/infra';
import { apiTest, testData, generateSemconvHostsData } from '../fixtures';

const semconvBasePayload: GetInfraMetricsRequestBodyPayloadClient = {
  limit: 10,
  // `rxV2` / `txV2` are intentionally omitted: the route rejects them when
  // `schema: 'semconv'`, see UNSUPPORTED_SEMCONV_METRICS in
  // x-pack/solutions/observability/plugins/infra/server/routes/infra/index.ts.
  metrics: ['cpuV2', 'diskSpaceUsage', 'memory', 'memoryFree', 'normalizedLoad1m'],
  from: testData.SEMCONV_HOSTS_DATA_FROM,
  to: testData.SEMCONV_HOSTS_DATA_TO,
  query: { bool: { must_not: [], filter: [], should: [], must: [] } },
  schema: 'semconv',
};

// Mirrors the exact error thrown by `UNSUPPORTED_SEMCONV_METRICS` in
// x-pack/solutions/observability/plugins/infra/server/routes/infra/index.ts
// so an unrelated 400 (e.g. unrelated body validation) cannot accidentally
// satisfy this assertion.
const unsupportedSemconvMessage = (metric: 'rxV2' | 'txV2') =>
  `The following metrics are not supported for semconv schema: ${metric}`;

apiTest.describe(
  'API /api/metrics/infra/host (semconv)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth, infraSynthtraceEsClient }) => {
      const adminApiKey: RoleApiCredentials = await requestAuth.getApiKey('admin');
      headers = { ...adminApiKey.apiKeyHeader, ...testData.COMMON_HEADERS };

      await infraSynthtraceEsClient.clean();
      await infraSynthtraceEsClient.index(
        generateSemconvHostsData({
          from: testData.SEMCONV_HOSTS_DATA_FROM,
          to: testData.SEMCONV_HOSTS_DATA_TO,
          hosts: testData.SEMCONV_HOSTS,
        })
      );
    });

    apiTest.afterAll(async ({ infraSynthtraceEsClient }) => {
      await infraSynthtraceEsClient.clean();
    });

    apiTest(
      'returns only OTel hosts (filtered by data_stream.dataset=hostmetricsreceiver.otel)',
      async ({ apiClient }) => {
        const response = await apiClient.post('api/metrics/infra/host', {
          headers,
          responseType: 'json',
          body: semconvBasePayload,
        });

        expect(response).toHaveStatusCode(200);
        const names = (response.body as GetInfraMetricsResponsePayload).nodes
          .map((p) => p.name)
          .sort();
        expect(names).toStrictEqual(testData.SEMCONV_HOSTS.map((h) => h.hostName).sort());
      }
    );

    apiTest(
      'reports hasSystemMetrics=true and computes core metrics for an OTel host',
      async ({ apiClient }) => {
        const response = await apiClient.post('api/metrics/infra/host', {
          headers,
          responseType: 'json',
          body: { ...semconvBasePayload, limit: 1 },
        });

        expect(response).toHaveStatusCode(200);
        const nodes = (response.body as GetInfraMetricsResponsePayload).nodes;

        expect(nodes).toHaveLength(1);
        expect(nodes[0].hasSystemMetrics).toBe(true);

        const metricsByName = Object.fromEntries(nodes[0].metrics.map((m) => [m.name, m.value]));
        // cpuV2 / memory derive from semconv state-based aggregations populated
        // by `infra.semconvHost(...).cpu()` / `.memory()`.
        expect(typeof metricsByName.cpuV2).toBe('number');
        expect(typeof metricsByName.memory).toBe('number');
        expect(typeof metricsByName.normalizedLoad1m).toBe('number');
      }
    );

    apiTest('rejects rxV2 with 400 when schema=semconv', async ({ apiClient }) => {
      const response = await apiClient.post('api/metrics/infra/host', {
        headers,
        responseType: 'json',
        body: { ...semconvBasePayload, metrics: ['rxV2'] },
      });

      expect(response).toHaveStatusCode(400);
      expect(testData.normalizeNewLine((response.body as { message: string }).message)).toBe(
        unsupportedSemconvMessage('rxV2')
      );
    });

    apiTest('rejects txV2 with 400 when schema=semconv', async ({ apiClient }) => {
      const response = await apiClient.post('api/metrics/infra/host', {
        headers,
        responseType: 'json',
        body: { ...semconvBasePayload, metrics: ['txV2'] },
      });

      expect(response).toHaveStatusCode(400);
      expect(testData.normalizeNewLine((response.body as { message: string }).message)).toBe(
        unsupportedSemconvMessage('txV2')
      );
    });

    apiTest(
      'returns only the queried OTel host when filtered by host.name',
      async ({ apiClient }) => {
        const targetHost = testData.SEMCONV_HOSTS[0].hostName;
        const response = await apiClient.post('api/metrics/infra/host', {
          headers,
          responseType: 'json',
          body: {
            ...semconvBasePayload,
            metrics: ['cpuV2'],
            query: { bool: { filter: [{ term: { 'host.name': targetHost } }] } },
          },
        });

        expect(response).toHaveStatusCode(200);
        const names = (response.body as GetInfraMetricsResponsePayload).nodes.map((p) => p.name);
        expect(names).toStrictEqual([targetHost]);
      }
    );
  }
);
