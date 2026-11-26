/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { GetInfraEntityCountResponsePayload } from '../../../../common/http_api';
import { apiTest, testData, generateSemconvHostsData } from '../fixtures';

const ecsTimeRange = {
  from: new Date(testData.DATES['8.0.0'].logs_and_metrics.min).toISOString(),
  to: new Date(testData.DATES['8.0.0'].logs_and_metrics.max).toISOString(),
};

const wideTimerange = testData.buildEcsAndSemconvWideTimerange({
  ecsFromMs: testData.DATES['8.0.0'].logs_and_metrics.min,
  ecsToMs: testData.DATES['8.0.0'].logs_and_metrics.max,
});

apiTest.describe(
  'API /api/infra/host/count',
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

    apiTest('counts ECS hosts with schema=ecs', async ({ apiClient }) => {
      const response = await apiClient.post('api/infra/host/count', {
        headers,
        responseType: 'json',
        body: {
          query: testData.emptyQuery,
          from: ecsTimeRange.from,
          to: ecsTimeRange.to,
          schema: 'ecs',
        },
      });

      expect(response).toHaveStatusCode(200);
      const infraHosts = response.body as GetInfraEntityCountResponsePayload;
      expect(infraHosts.count).toBe(3);
      expect(infraHosts.entityType).toBe('host');
    });

    apiTest('counts only OTel hosts with schema=semconv', async ({ apiClient }) => {
      const response = await apiClient.post('api/infra/host/count', {
        headers,
        responseType: 'json',
        body: {
          query: testData.emptyQuery,
          from: testData.SEMCONV_HOSTS_DATA_FROM,
          to: testData.SEMCONV_HOSTS_DATA_TO,
          schema: 'semconv',
        },
      });

      expect(response).toHaveStatusCode(200);
      const infraHosts = response.body as GetInfraEntityCountResponsePayload;
      expect(infraHosts.entityType).toBe('host');
      expect(infraHosts.count).toBe(testData.SEMCONV_HOSTS.length);
    });

    // These mixed-schema suites cover the cohort split when ECS-archived
    // hosts and OTel synthtrace hosts coexist in the cluster. They do NOT
    // cover *dual-shipping* (the same `host.name` ingested through both
    // pipelines), where naive sum-of-counts would over-count distinct
    // machines during a migration — that scenario is out of scope for this
    // suite; see issue #264011 for tracking.
    apiTest('schema=ecs returns the ECS host count only (mixed data)', async ({ apiClient }) => {
      const response = await apiClient.post('api/infra/host/count', {
        headers,
        responseType: 'json',
        body: { query: testData.emptyQuery, ...wideTimerange, schema: 'ecs' },
      });

      expect(response).toHaveStatusCode(200);
      const infraHosts = response.body as GetInfraEntityCountResponsePayload;
      expect(infraHosts.count).toBe(3);
    });

    apiTest(
      'schema=semconv returns the OTel host count only (mixed data)',
      async ({ apiClient }) => {
        const response = await apiClient.post('api/infra/host/count', {
          headers,
          responseType: 'json',
          body: { query: testData.emptyQuery, ...wideTimerange, schema: 'semconv' },
        });

        expect(response).toHaveStatusCode(200);
        const infraHosts = response.body as GetInfraEntityCountResponsePayload;
        expect(infraHosts.count).toBe(testData.SEMCONV_HOSTS.length);
      }
    );
  }
);
