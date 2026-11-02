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
import { apiTest, testData } from '../fixtures';

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

apiTest.describe(
  'API /api/metrics/infra/host (ECS)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth, esArchiver }) => {
      const adminApiKey: RoleApiCredentials = await requestAuth.getApiKey('admin');
      headers = { ...adminApiKey.apiKeyHeader, ...testData.COMMON_HEADERS };
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGS_AND_METRICS_8_0_0);
    });

    apiTest('returns metrics for a host', async ({ apiClient }) => {
      const body: GetInfraMetricsRequestBodyPayloadClient = { ...basePayload, limit: 1 };
      const response = await apiClient.post('api/metrics/infra/host', {
        headers,
        responseType: 'json',
        body,
      });

      expect(response).toHaveStatusCode(200);
      const result = response.body as GetInfraMetricsResponsePayload;
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes).toStrictEqual([
        {
          metadata: [
            { name: 'host.os.name', value: 'CentOS Linux' },
            { name: 'cloud.provider', value: 'gcp' },
            { name: 'host.ip', value: null },
          ],
          metrics: [
            { name: 'cpu', value: 0.44708333333333333 },
            { name: 'cpuV2', value: null },
            { name: 'diskSpaceUsage', value: null },
            { name: 'memory', value: 0.4563333333333333 },
            { name: 'memoryFree', value: 8573890560 },
            { name: 'normalizedLoad1m', value: 0.7375000000000002 },
            { name: 'rx', value: null },
            { name: 'tx', value: null },
          ],
          hasSystemMetrics: true,
          name: 'gke-observability-8--observability-8--bc1afd95-f0zc',
        },
      ]);
    });

    apiTest('returns all hosts if query params is not sent', async ({ apiClient }) => {
      const body: GetInfraMetricsRequestBodyPayloadClient = {
        ...basePayload,
        metrics: ['memory'],
        query: undefined,
      };

      const response = await apiClient.post('api/metrics/infra/host', {
        headers,
        responseType: 'json',
        body,
      });

      expect(response).toHaveStatusCode(200);
      expect((response.body as GetInfraMetricsResponsePayload).nodes).toStrictEqual([
        {
          metadata: [
            { name: 'host.os.name', value: 'CentOS Linux' },
            { name: 'cloud.provider', value: 'gcp' },
            { name: 'host.ip', value: null },
          ],
          metrics: [{ name: 'memory', value: 0.4563333333333333 }],
          hasSystemMetrics: true,
          name: 'gke-observability-8--observability-8--bc1afd95-f0zc',
        },
        {
          metadata: [
            { name: 'host.os.name', value: 'CentOS Linux' },
            { name: 'cloud.provider', value: 'gcp' },
            { name: 'host.ip', value: null },
          ],
          metrics: [{ name: 'memory', value: 0.32066666666666666 }],
          hasSystemMetrics: true,
          name: 'gke-observability-8--observability-8--bc1afd95-ngmh',
        },
        {
          metadata: [
            { name: 'host.os.name', value: 'CentOS Linux' },
            { name: 'cloud.provider', value: 'gcp' },
            { name: 'host.ip', value: null },
          ],
          metrics: [{ name: 'memory', value: 0.2346666666666667 }],
          hasSystemMetrics: true,
          name: 'gke-observability-8--observability-8--bc1afd95-nhhw',
        },
      ]);
    });

    apiTest('returns 3 hosts when filtered by host.os.name=CentOS Linux', async ({ apiClient }) => {
      const body: GetInfraMetricsRequestBodyPayloadClient = {
        ...basePayload,
        metrics: ['cpuV2'],
        query: { bool: { filter: [{ term: { 'host.os.name': 'CentOS Linux' } }] } },
      };
      const response = await apiClient.post('api/metrics/infra/host', {
        headers,
        responseType: 'json',
        body,
      });

      expect(response).toHaveStatusCode(200);
      const names = (response.body as GetInfraMetricsResponsePayload).nodes.map((p) => p.name);
      expect(names).toStrictEqual([
        'gke-observability-8--observability-8--bc1afd95-f0zc',
        'gke-observability-8--observability-8--bc1afd95-ngmh',
        'gke-observability-8--observability-8--bc1afd95-nhhw',
      ]);
    });

    apiTest('returns 0 hosts when filtered by host.os.name=Ubuntu', async ({ apiClient }) => {
      const body: GetInfraMetricsRequestBodyPayloadClient = {
        ...basePayload,
        metrics: ['cpuV2'],
        query: { bool: { filter: [{ term: { 'host.os.name': 'Ubuntu' } }] } },
      };
      const response = await apiClient.post('api/metrics/infra/host', {
        headers,
        responseType: 'json',
        body,
      });

      expect(response).toHaveStatusCode(200);
      const names = (response.body as GetInfraMetricsResponsePayload).nodes.map((p) => p.name);
      expect(names).toStrictEqual([]);
    });

    apiTest(
      'returns hosts when filtered by must_not host.name=gke-observability-8--observability-8--bc1afd95-nhhw',
      async ({ apiClient }) => {
        const body: GetInfraMetricsRequestBodyPayloadClient = {
          ...basePayload,
          metrics: ['cpuV2'],
          query: {
            bool: {
              must_not: [
                { term: { 'host.name': 'gke-observability-8--observability-8--bc1afd95-nhhw' } },
              ],
            },
          },
        };
        const response = await apiClient.post('api/metrics/infra/host', {
          headers,
          responseType: 'json',
          body,
        });

        expect(response).toHaveStatusCode(200);
        const names = (response.body as GetInfraMetricsResponsePayload).nodes.map((p) => p.name);
        expect(names).toStrictEqual([
          'gke-observability-8--observability-8--bc1afd95-f0zc',
          'gke-observability-8--observability-8--bc1afd95-ngmh',
        ]);
      }
    );
  }
);
