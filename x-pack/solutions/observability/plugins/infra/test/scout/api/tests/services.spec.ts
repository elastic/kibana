/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, generateServicesData, generateServicesLogsOnlyData, testData } from '../fixtures';

const SERVICES_ENDPOINT = 'api/infra/services';

interface ServicesResponse {
  services: unknown[];
}

/**
 * FTR called `apmSynthtraceEsClient.initializePackage({ skipInstallation: false })`.
 * Scout's `apmSynthtraceEsClient` fixture already installs the APM Fleet package via
 * `getSynthtraceClient` (`skipInstallation` defaults to false), so no extra init is needed.
 */
apiTest.describe(
  'GET /infra/services',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    let range: { from: string; to: string };

    apiTest.beforeAll(async ({ samlAuth, apmSynthtraceEsClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...testData.COMMON_HEADERS, ...cookieHeader };
      range = testData.getServicesSynthtraceRange();

      await apmSynthtraceEsClient.clean();
      await apmSynthtraceEsClient.index(
        generateServicesData({
          from: range.from,
          to: range.to,
          instanceCount: 3,
          servicesPerHost: 3,
        })
      );
    });

    apiTest.afterAll(async ({ apmSynthtraceEsClient }) => {
      await apmSynthtraceEsClient.clean();
    });

    const servicesUrl = (filters: string) => {
      const params = new URLSearchParams({
        filters,
        from: range.from,
        to: range.to,
      });
      return `${SERVICES_ENDPOINT}?${params.toString()}`;
    };

    apiTest('returns no services with no data', async ({ apiClient }) => {
      const response = await apiClient.get(
        servicesUrl(JSON.stringify({ 'host.name': 'some-host' })),
        {
          headers,
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      const body = response.body as ServicesResponse;
      expect(body.services).toHaveLength(0);
    });

    apiTest(
      'should return correct number of services running on specified host',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          servicesUrl(JSON.stringify({ 'host.name': 'host-0' })),
          {
            headers,
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        const body = response.body as ServicesResponse;
        expect(body.services).toHaveLength(3);
      }
    );

    apiTest('should return bad request if unallowed filter', async ({ apiClient }) => {
      const response = await apiClient.get(
        servicesUrl(
          JSON.stringify({
            'host.name': 'host-0',
            'agent.name': 'nodejs',
          })
        ),
        {
          headers,
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(400);
    });

    apiTest(
      'should return services with logs only data',
      async ({ apiClient, apmSynthtraceEsClient }) => {
        await apmSynthtraceEsClient.clean();
        await apmSynthtraceEsClient.index(
          generateServicesLogsOnlyData({
            from: range.from,
            to: range.to,
            instanceCount: 1,
            servicesPerHost: 2,
          })
        );

        const response = await apiClient.get(
          servicesUrl(JSON.stringify({ 'host.name': 'host-0' })),
          {
            headers,
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        const body = response.body as ServicesResponse;
        expect(body.services).toHaveLength(2);
      }
    );
  }
);
