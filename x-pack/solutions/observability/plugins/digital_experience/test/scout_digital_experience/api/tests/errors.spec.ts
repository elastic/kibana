/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { ApplicationErrorsResponse } from '../../../../common/types/errors';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const {
  COMMON_HEADERS,
  DIGITAL_EXPERIENCE_ONLY_ROLE,
  OTEL_APPS,
  OTEL_SHOP_ERRORS,
  STAGING_ENVIRONMENT,
  applicationTabPath,
} = testData;

apiTest.describe('Digital Experience errors API', { tag: DIGITAL_EXPERIENCE_TAGS }, () => {
  apiTest('returns the error groups of the application', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

    const response = await apiClient.get(applicationTabPath(OTEL_APPS.shop, 'errors'), {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const { serviceName, errors, hasMoreErrors, environments } =
      response.body as ApplicationErrorsResponse;
    expect(serviceName).toBe(OTEL_APPS.shop);
    expect(errors).toStrictEqual(OTEL_SHOP_ERRORS);
    expect(hasMoreErrors).toBe(false);
    expect(environments).toStrictEqual(['production']);
  });

  apiTest(
    'returns no errors for an application without data, or another environment',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
      const headers = { ...COMMON_HEADERS, ...cookieHeader };

      const missing = await apiClient.get(applicationTabPath('no-such-application', 'errors'), {
        headers,
        responseType: 'json',
      });
      expect(missing).toHaveStatusCode(200);
      expect(missing.body).toStrictEqual({
        serviceName: 'no-such-application',
        errors: [],
        hasMoreErrors: false,
        environments: [],
      });

      const staging = await apiClient.get(
        applicationTabPath(OTEL_APPS.shop, 'errors', STAGING_ENVIRONMENT),
        { headers, responseType: 'json' }
      );
      expect(staging).toHaveStatusCode(200);
      // The picker still lists the application's environments.
      expect(staging.body).toStrictEqual({
        serviceName: OTEL_APPS.shop,
        errors: [],
        hasMoreErrors: false,
        environments: ['production'],
      });
    }
  );

  apiTest(
    'lists an environment with browser data but no errors',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(applicationTabPath(OTEL_APPS.docs, 'errors'), {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        serviceName: OTEL_APPS.docs,
        errors: [],
        hasMoreErrors: false,
        environments: [STAGING_ENVIRONMENT],
      });
    }
  );

  apiTest(
    'groups the missing and empty stack traces of a type together',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(applicationTabPath(OTEL_APPS.checkout, 'errors'), {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect((response.body as ApplicationErrorsResponse).errors).toStrictEqual([
        {
          type: 'TypeError',
          stacktrace: null,
          message: 'x is undefined',
          count: 3,
          lastSeen: '2021-01-18T12:23:00.000Z',
        },
      ]);
    }
  );

  apiTest('returns 403 without the APM privilege', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(DIGITAL_EXPERIENCE_ONLY_ROLE);

    const response = await apiClient.get(applicationTabPath(OTEL_APPS.shop, 'errors'), {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(403);
  });
});
