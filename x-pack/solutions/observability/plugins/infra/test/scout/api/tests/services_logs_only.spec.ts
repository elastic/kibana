/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { ServicesAPIResponse } from '../../../../common/http_api/host_details';
import { apiTest, buildServicesUrl, generateServicesLogsOnlyData, testData } from '../fixtures';

apiTest.describe(
  'GET /infra/services with logs only',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    let range: { from: string; to: string };

    apiTest.beforeAll(async ({ requestAuth, apmSynthtraceEsClient }) => {
      const adminApiKey: RoleApiCredentials = await requestAuth.getApiKey('admin');
      headers = { ...adminApiKey.apiKeyHeader, ...testData.COMMON_HEADERS };
      range = testData.getRecentTimerange(2);

      await apmSynthtraceEsClient.index(
        generateServicesLogsOnlyData({ ...range, instanceCount: 1, servicesPerHost: 2 })
      );
    });

    apiTest.afterAll(async ({ apmSynthtraceEsClient }) => {
      await apmSynthtraceEsClient.clean();
    });

    apiTest('should return services with logs only data', async ({ apiClient }) => {
      const response = await apiClient.get(
        buildServicesUrl({ ...range, filters: { 'host.name': 'host-0' } }),
        {
          headers,
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      expect((response.body as ServicesAPIResponse).services).toHaveLength(2);
    });
  }
);
