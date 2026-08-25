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

const basePayload: GetInfraMetricsRequestBodyPayloadClient = {
  limit: 10,
  metrics: [
    'cpu',
    'cpuV2',
    'diskSpaceUsage',
    'memory',
    'memoryFree',
    'normalizedLoad1m',
    'rx',
    'tx',
  ],
  from: new Date(testData.DATES['8.0.0'].logs_and_metrics.min).toISOString(),
  to: new Date(testData.DATES['8.0.0'].logs_and_metrics.max).toISOString(),
  query: { bool: { must_not: [], filter: [], should: [], must: [] } },
  schema: 'ecs',
};

const wideTimerange = testData.buildEcsAndSemconvWideTimerange({
  ecsFromMs: testData.DATES['8.0.0'].logs_and_metrics.min,
  ecsToMs: testData.DATES['8.0.0'].logs_and_metrics.max,
});

// These mixed-schema cases cover the cohort split when ECS-archived hosts
// and OTel synthtrace hosts coexist in the cluster. They do NOT cover
// *dual-shipping* (the same `host.name` ingested through both pipelines);
// see issue #264011 for tracking.
apiTest.describe(
  'API /api/metrics/infra/host (mixed ECS + semconv)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth, esArchiver, infraSynthtraceEsClient }) => {
      const adminApiKey: RoleApiCredentials = await requestAuth.getApiKey('admin');
      headers = { ...adminApiKey.apiKeyHeader, ...testData.COMMON_HEADERS };

      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGS_AND_METRICS_8_0_0);
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

    apiTest('returns only ECS hosts when schema=ecs', async ({ apiClient }) => {
      const response = await apiClient.post('api/metrics/infra/host', {
        headers,
        responseType: 'json',
        body: {
          ...basePayload,
          metrics: ['cpuV2'],
          ...wideTimerange,
          schema: 'ecs',
        },
      });

      expect(response).toHaveStatusCode(200);
      const names = (response.body as GetInfraMetricsResponsePayload).nodes
        .map((p) => p.name)
        .sort();

      expect(names).toStrictEqual([
        'gke-observability-8--observability-8--bc1afd95-f0zc',
        'gke-observability-8--observability-8--bc1afd95-ngmh',
        'gke-observability-8--observability-8--bc1afd95-nhhw',
      ]);
      for (const name of names) {
        expect(testData.SEMCONV_HOSTS.map((h) => h.hostName)).not.toContain(name);
      }
    });

    apiTest('returns only OTel hosts when schema=semconv', async ({ apiClient }) => {
      const response = await apiClient.post('api/metrics/infra/host', {
        headers,
        responseType: 'json',
        body: {
          limit: 10,
          metrics: ['cpuV2'],
          ...wideTimerange,
          query: { bool: { must_not: [], filter: [], should: [], must: [] } },
          schema: 'semconv',
        },
      });

      expect(response).toHaveStatusCode(200);
      const names = (response.body as GetInfraMetricsResponsePayload).nodes
        .map((p) => p.name)
        .sort();

      expect(names).toStrictEqual(testData.SEMCONV_HOSTS.map((h) => h.hostName).sort());
    });
  }
);
