/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import type { ServicesAPIResponse } from '../../../../common/http_api/host_details';
import { ServicesAPIResponseRT } from '../../../../common/http_api/host_details';
import { apiTest, buildServicesUrl, generateServicesData, testData } from '../fixtures';

/**
 * The FTR suite called `apmSynthtraceEsClient.initializePackage({ skipInstallation: false })`.
 * Scout's `apmSynthtraceEsClient` fixture already installs the APM Fleet package, so no
 * extra initialization is needed here.
 */
apiTest.describe(
  'GET /infra/services with transactions',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    let range: { from: string; to: string };

    apiTest.beforeAll(async ({ requestAuth, apmSynthtraceEsClient }) => {
      const adminApiKey: RoleApiCredentials = await requestAuth.getApiKey('admin');
      headers = { ...adminApiKey.apiKeyHeader, ...testData.COMMON_HEADERS };
      range = testData.getRecentTimerange(2, 35);

      await apmSynthtraceEsClient.index(
        generateServicesData({ ...range, instanceCount: 3, servicesPerHost: 3 })
      );
    });

    apiTest.afterAll(async ({ apmSynthtraceEsClient }) => {
      await apmSynthtraceEsClient.clean();
    });

    apiTest('returns no services with no data', async ({ apiClient }) => {
      const response = await apiClient.get(
        buildServicesUrl({ ...range, filters: { 'host.name': 'some-host' } }),
        {
          headers,
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);

      const { services } = decodeOrThrow(ServicesAPIResponseRT)(response.body);
      expect(services).toHaveLength(0);
    });

    apiTest(
      'should return correct number of services running on specified host',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          buildServicesUrl({ ...range, filters: { 'host.name': 'host-0' } }),
          {
            headers,
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect((response.body as ServicesAPIResponse).services).toHaveLength(3);
      }
    );

    apiTest('should return bad request if unallowed filter', async ({ apiClient }) => {
      const response = await apiClient.get(
        buildServicesUrl({
          ...range,
          filters: { 'host.name': 'host-0', 'agent.name': 'nodejs' },
        }),
        {
          headers,
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(400);
    });
  }
);
