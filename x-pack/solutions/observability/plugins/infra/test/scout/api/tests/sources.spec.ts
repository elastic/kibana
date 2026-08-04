/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { infra, timerange } from '@kbn/synthtrace-client';
import type {
  MetricsSourceConfigurationResponse,
  PartialMetricsSourceConfigurationProperties,
} from '../../../../common/metrics_sources';
import { metricsSourceConfigurationResponseRT } from '../../../../common/metrics_sources';
import { apiTest, testData } from '../fixtures';

const SOURCE_API_URL = 'api/metrics/source';
const SOURCE_ID = 'default';
const DEFAULT_METRIC_ALIAS = 'metrics-*,metricbeat-*';

function generateMetricsData({ from, to }: { from: string; to: string }) {
  const range = timerange(from, to);

  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => [
      infra.host('demo-host-1').cpu({ 'system.cpu.total.norm.pct': 0.5 }).timestamp(timestamp),
      infra.host('demo-host-1').memory().timestamp(timestamp),
      infra.host('demo-host-1').network().timestamp(timestamp),
      infra.host('demo-host-2').cpu({ 'system.cpu.total.norm.pct': 0.3 }).timestamp(timestamp),
      infra.host('demo-host-2').memory().timestamp(timestamp),
      infra.host('demo-host-2').network().timestamp(timestamp),
    ]);
}

apiTest.describe(
  'API /api/metrics/source',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    let range: { from: string; to: string };

    const patchRequest = async (
      apiClient: ApiClientFixture,
      body: PartialMetricsSourceConfigurationProperties,
      expectedHttpStatusCode = 200
    ): Promise<MetricsSourceConfigurationResponse | undefined> => {
      const response = await apiClient.patch(`${SOURCE_API_URL}/${SOURCE_ID}`, {
        headers,
        responseType: 'json',
        body,
      });
      expect(response).toHaveStatusCode(expectedHttpStatusCode);
      if (expectedHttpStatusCode !== 200) {
        return undefined;
      }
      return response.body as MetricsSourceConfigurationResponse;
    };

    apiTest.beforeAll(async ({ samlAuth, infraSynthtraceEsClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...testData.COMMON_HEADERS, ...cookieHeader };
      range = testData.getRecentTimerange(10);

      await infraSynthtraceEsClient.clean();
      await infraSynthtraceEsClient.index(generateMetricsData(range));
    });

    apiTest.beforeEach(async ({ kbnClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
    });

    // Dropping the stored source restores the fallback default configuration other infra
    // suites rely on.
    apiTest.afterAll(async ({ infraSynthtraceEsClient, kbnClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
      await infraSynthtraceEsClient.clean();
    });

    apiTest(
      'PATCH applies all top-level field updates to an existing source',
      async ({ apiClient }) => {
        const creationResponse = await patchRequest(apiClient, {
          name: 'NAME',
        });

        const initialVersion = creationResponse?.source.version;
        const createdAt = creationResponse?.source.updatedAt;

        expect(typeof initialVersion).toBe('string');
        expect(createdAt ?? 0).toBeGreaterThan(0);

        const updateResponse = await patchRequest(apiClient, {
          name: 'UPDATED_NAME',
          description: 'UPDATED_DESCRIPTION',
          metricAlias: 'metrics-*',
        });

        expect(metricsSourceConfigurationResponseRT.is(updateResponse)).toBe(true);

        const version = updateResponse?.source.version;
        const updatedAt = updateResponse?.source.updatedAt;
        const configuration = updateResponse?.source.configuration;
        const status = updateResponse?.source.status;

        expect(typeof version).toBe('string');
        expect(version).not.toBe(initialVersion);
        expect(updatedAt ?? 0).toBeGreaterThan(createdAt || 0);
        expect(configuration?.name).toBe('UPDATED_NAME');
        expect(configuration?.description).toBe('UPDATED_DESCRIPTION');
        expect(configuration?.metricAlias).toBe('metrics-*');
        expect(configuration?.anomalyThreshold).toBe(50);
        expect(status?.metricIndicesExist).toBe(true);
      }
    );

    apiTest(
      'PATCH applies a single top-level update to an existing source',
      async ({ apiClient }) => {
        const creationResponse = await patchRequest(apiClient, {
          name: 'NAME',
        });

        const initialVersion = creationResponse?.source.version;
        const createdAt = creationResponse?.source.updatedAt;

        expect(typeof initialVersion).toBe('string');
        expect(createdAt ?? 0).toBeGreaterThan(0);

        const updateResponse = await patchRequest(apiClient, {
          name: 'UPDATED_NAME',
          description: 'UPDATED_DESCRIPTION',
          metricAlias: 'metrics-*',
        });

        const version = updateResponse?.source.version;
        const updatedAt = updateResponse?.source.updatedAt;
        const configuration = updateResponse?.source.configuration;
        const status = updateResponse?.source.status;

        expect(typeof version).toBe('string');
        expect(version).not.toBe(initialVersion);
        expect(updatedAt ?? 0).toBeGreaterThan(createdAt || 0);
        expect(configuration?.metricAlias).toBe('metrics-*');
        expect(status?.metricIndicesExist).toBe(true);
      }
    );

    apiTest('PATCH validates anomalyThreshold is between range 1-100', async ({ apiClient }) => {
      await patchRequest(apiClient, { name: 'NAME', anomalyThreshold: -20 }, 400);
      await patchRequest(apiClient, { name: 'NAME', anomalyThreshold: 20 });
      await patchRequest(apiClient, { anomalyThreshold: -2 }, 400);
      await patchRequest(apiClient, { anomalyThreshold: 101 }, 400);
    });

    apiTest('GET source by id should just work', async ({ apiClient }) => {
      const response = await apiClient.get(`${SOURCE_API_URL}/default`, {
        headers,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const body = response.body as MetricsSourceConfigurationResponse;
      expect(body.source).toBeDefined();
      expect(body.source.configuration?.metricAlias).toBe(DEFAULT_METRIC_ALIAS);
      expect(body.source.status).toBeDefined();
      expect(body.source.status?.metricIndicesExist).toBe(true);
    });

    apiTest('GET source hasData by id should just work', async ({ apiClient }) => {
      const response = await apiClient.get(`${SOURCE_API_URL}/default/hasData`, {
        headers,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const body = response.body as { hasData?: boolean };
      expect(body.hasData).toBeDefined();
      expect(body.hasData).toBe(true);
    });

    // The FTR suite queried `?modules=system|nginx`, which the route's query codec no longer
    // accepts, so all three cases silently exercised the same unfiltered lookup and asserted
    // `true`. These use the current `source` param instead: `host` and `all` filter for real,
    // while `pod` falls back to the unfiltered lookup the FTR cases covered. The source config
    // is patched per test because `beforeEach` drops it — the FTR suite patched it once in a
    // `before` hook that its own `beforeEach` cleanup then wiped.
    apiTest('GET hasData returns true when source is host', async ({ apiClient }) => {
      await patchRequest(apiClient, {
        name: 'default',
        metricAlias: DEFAULT_METRIC_ALIAS,
      });

      const response = await apiClient.get(`${SOURCE_API_URL}/hasData?source=host`, {
        headers,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect((response.body as { hasData: boolean }).hasData).toBe(true);
    });

    apiTest('GET hasData returns true when source is pod', async ({ apiClient }) => {
      await patchRequest(apiClient, {
        name: 'default',
        metricAlias: DEFAULT_METRIC_ALIAS,
      });

      const response = await apiClient.get(`${SOURCE_API_URL}/hasData?source=pod`, {
        headers,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect((response.body as { hasData: boolean }).hasData).toBe(true);
    });

    apiTest('GET hasData returns true when source is all', async ({ apiClient }) => {
      await patchRequest(apiClient, {
        name: 'default',
        metricAlias: DEFAULT_METRIC_ALIAS,
      });

      const response = await apiClient.get(`${SOURCE_API_URL}/hasData?source=all`, {
        headers,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect((response.body as { hasData: boolean }).hasData).toBe(true);
    });
  }
);
