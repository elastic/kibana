/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { ApplicationNetworkResponse } from '../../../../common/types/network';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const {
  COMMON_HEADERS,
  DIGITAL_EXPERIENCE_ONLY_ROLE,
  OTEL_APPS,
  OTEL_SHOP_NETWORK,
  STAGING_ENVIRONMENT,
  applicationTabPath,
} = testData;

apiTest.describe('Digital Experience network API', { tag: DIGITAL_EXPERIENCE_TAGS }, () => {
  apiTest(
    'returns the HTTP requests and slowest resources of the application',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(applicationTabPath(OTEL_APPS.shop, 'network'), {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const { httpRequests, slowestResources, environments } =
        response.body as ApplicationNetworkResponse;
      expect(httpRequests).toStrictEqual(OTEL_SHOP_NETWORK.httpRequests);
      expect(slowestResources).toStrictEqual(OTEL_SHOP_NETWORK.slowestResources);
      expect(environments).toStrictEqual(['production']);
    }
  );

  apiTest(
    'returns empty lists for an application without data, or another environment',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
      const headers = { ...COMMON_HEADERS, ...cookieHeader };

      const missing = await apiClient.get(applicationTabPath('no-such-application', 'network'), {
        headers,
        responseType: 'json',
      });
      expect(missing).toHaveStatusCode(200);
      expect(missing.body).toStrictEqual({
        serviceName: 'no-such-application',
        httpRequests: [],
        slowestResources: [],
        environments: [],
      });

      const staging = await apiClient.get(
        applicationTabPath(OTEL_APPS.shop, 'network', STAGING_ENVIRONMENT),
        { headers, responseType: 'json' }
      );
      expect(staging).toHaveStatusCode(200);
      expect(staging.body).toStrictEqual({
        serviceName: OTEL_APPS.shop,
        httpRequests: [],
        slowestResources: [],
        environments: ['production'],
      });
    }
  );

  apiTest(
    'lists an environment with page loads but no resources',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(applicationTabPath(OTEL_APPS.docs, 'network'), {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        serviceName: OTEL_APPS.docs,
        httpRequests: [],
        slowestResources: [],
        environments: [STAGING_ENVIRONMENT],
      });
    }
  );

  apiTest('returns 403 without the APM privilege', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(DIGITAL_EXPERIENCE_ONLY_ROLE);

    const response = await apiClient.get(applicationTabPath(OTEL_APPS.shop, 'network'), {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(403);
  });
});
