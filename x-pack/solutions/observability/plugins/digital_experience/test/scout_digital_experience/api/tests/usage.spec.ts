/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { ApplicationUsageResponse } from '../../../../common/types/usage';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const {
  COMMON_HEADERS,
  DIGITAL_EXPERIENCE_ONLY_ROLE,
  OTEL_APPS,
  OTEL_SHOP_USAGE,
  STAGING_ENVIRONMENT,
  applicationTabPath,
} = testData;

const EMPTY_USAGE = {
  topPages: [],
  breakdowns: { pageLoads: 0, browsers: [], operatingSystems: [], devices: [] },
  topClicks: [],
  totalClicks: 0,
};

const usagePath = (serviceName: string, environment?: string) => {
  return applicationTabPath(serviceName, 'usage', environment);
};

apiTest.describe('Digital Experience usage API', { tag: DIGITAL_EXPERIENCE_TAGS }, () => {
  apiTest(
    'returns the pages, breakdowns and clicks of the application',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(usagePath(OTEL_APPS.shop), {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const usage = response.body as ApplicationUsageResponse;
      expect(usage.topPages).toStrictEqual(OTEL_SHOP_USAGE.topPages);
      expect(usage.breakdowns).toStrictEqual(OTEL_SHOP_USAGE.breakdowns);
      expect(usage.topClicks).toStrictEqual(OTEL_SHOP_USAGE.topClicks);
      expect(usage.totalClicks).toBe(OTEL_SHOP_USAGE.totalClicks);
    }
  );

  apiTest(
    'returns empty lists for an application without data',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(usagePath('no-such-application'), {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual(EMPTY_USAGE);
    }
  );

  apiTest('only returns the data of the selected environment', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
    const headers = { ...COMMON_HEADERS, ...cookieHeader };

    await apiTest.step('the environment of the application has its data', async () => {
      const response = await apiClient.get(usagePath(OTEL_APPS.shop, 'production'), {
        headers,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const usage = response.body as ApplicationUsageResponse;
      expect(usage.topPages).toStrictEqual(OTEL_SHOP_USAGE.topPages);
    });

    await apiTest.step('another environment has none', async () => {
      const response = await apiClient.get(usagePath(OTEL_APPS.shop, STAGING_ENVIRONMENT), {
        headers,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual(EMPTY_USAGE);
    });
  });

  apiTest('returns 403 without the APM privilege', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(DIGITAL_EXPERIENCE_ONLY_ROLE);

    const response = await apiClient.get(usagePath(OTEL_APPS.shop), {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(403);
  });
});
