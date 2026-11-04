/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { ApplicationsResponse } from '../../../../common/types/applications';
import { findApplication, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const {
  APM_ONLY_ROLE,
  APPLICATIONS_IN_TIME_RANGE_PATH,
  APPLICATIONS_PATH,
  COMMON_HEADERS,
  DIGITAL_EXPERIENCE_ONLY_ROLE,
  DIGITAL_EXPERIENCE_READ_ROLE,
  OTEL_APPS,
  SERVICE_NAME,
  STAGING_ENVIRONMENT,
  TIME_RANGE,
} = testData;

apiTest.describe('Digital Experience applications API', { tag: DIGITAL_EXPERIENCE_TAGS }, () => {
  apiTest(
    'returns the metrics of the EDOT Browser applications',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(APPLICATIONS_IN_TIME_RANGE_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const { applications, environments, unavailableSources } =
        response.body as ApplicationsResponse;
      expect(unavailableSources).toStrictEqual([]);
      expect(environments).toStrictEqual(
        expect.arrayContaining(['production', STAGING_ENVIRONMENT])
      );

      const shop = findApplication(applications, OTEL_APPS.shop, 'otel');
      expect(shop).toMatchObject({
        environments: ['production'],
        pageLoads: { count: 4 },
        webVitals: {
          lcp: { p75Ms: 2412.5, sampleCount: 1, ratings: { good: 1 } },
          inp: { p75Ms: 143.5, sampleCount: 1, ratings: { good: 1 } },
          cls: { sampleCount: 1, ratings: { good: 1 } },
          fcp: { p75Ms: 1650.5, sampleCount: 1, ratings: { good: 1 } },
          ttfb: { p75Ms: 950.25, sampleCount: 1, ratings: { needsImprovement: 1 } },
        },
        jsErrors: { count: 1, perPageLoad: 0.25 },
        httpRequests: { count: 4, failedCount: 0, failedRatio: 0 },
        lastSeen: '2021-01-18T12:33:00.000Z',
      });
      expect(shop?.webVitals.cls.p75).toBeCloseTo(0.045);

      expect(findApplication(applications, OTEL_APPS.checkout, 'otel')).toMatchObject({
        pageLoads: { count: 2 },
        webVitals: {
          lcp: { p75Ms: 3250.75, ratings: { needsImprovement: 1 } },
          inp: { p75Ms: 612.5, ratings: { poor: 1 } },
          cls: { ratings: { needsImprovement: 1 } },
          fcp: { p75Ms: null, sampleCount: 0, ratings: null },
        },
        jsErrors: { count: 3, perPageLoad: 1.5 },
        httpRequests: { count: 4, failedCount: 1, failedRatio: 0.25 },
      });
      expect(findApplication(applications, OTEL_APPS.docs, 'otel')).toMatchObject({
        environments: [STAGING_ENVIRONMENT],
        pageLoads: { count: 1 },
        webVitals: { lcp: { p75Ms: null, sampleCount: 0, ratings: null } },
        httpRequests: { count: 0, failedRatio: null },
      });
      expect(findApplication(applications, OTEL_APPS.blog, 'otel')).toMatchObject({
        environments: [],
      });
      expect(findApplication(applications, SERVICE_NAME, 'otel')).toMatchObject({
        pageLoads: { count: 1 },
      });
    }
  );

  apiTest(
    'returns 403 without the Digital Experience privilege',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(APM_ONLY_ROLE);

      const response = await apiClient.get(APPLICATIONS_IN_TIME_RANGE_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest('returns 403 without the APM privilege', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(DIGITAL_EXPERIENCE_ONLY_ROLE);

    const response = await apiClient.get(APPLICATIONS_IN_TIME_RANGE_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(403);
  });

  apiTest(
    'returns 403 without Elasticsearch details when no data can be read',
    async ({ apiClient, samlAuth }) => {
      // The Kibana privileges of the app, without any index privilege.
      const { cookieHeader } = await samlAuth.asInteractiveUser(DIGITAL_EXPERIENCE_READ_ROLE);

      const response = await apiClient.get(APPLICATIONS_IN_TIME_RANGE_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
      expect(response.body.message).toBe("You don't have read access to the application data.");
    }
  );

  apiTest('returns 400 for invalid query params', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
    const headers = { ...COMMON_HEADERS, ...cookieHeader };
    const { rangeFrom, rangeTo } = TIME_RANGE;

    await apiTest.step('rejects a start that is not a date', async () => {
      const response = await apiClient.get(`${APPLICATIONS_PATH}?start=foo&end=${rangeTo}`, {
        headers,
      });
      expect(response).toHaveStatusCode(400);
    });

    await apiTest.step('rejects a start after the end', async () => {
      const response = await apiClient.get(
        `${APPLICATIONS_PATH}?start=${rangeTo}&end=${rangeFrom}`,
        { headers }
      );
      expect(response).toHaveStatusCode(400);
    });

    await apiTest.step('rejects a missing time range', async () => {
      const response = await apiClient.get(APPLICATIONS_PATH, { headers });
      expect(response).toHaveStatusCode(400);
    });

    await apiTest.step('rejects an environment over 1024 characters', async () => {
      const response = await apiClient.get(
        `${APPLICATIONS_IN_TIME_RANGE_PATH}&environment=${'x'.repeat(1025)}`,
        { headers }
      );
      expect(response).toHaveStatusCode(400);
    });
  });

  apiTest('accepts environments up to 1024 characters', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
    const headers = { ...COMMON_HEADERS, ...cookieHeader };

    for (const length of [201, 1024]) {
      await apiTest.step(`accepts an environment of ${length} characters`, async () => {
        const response = await apiClient.get(
          `${APPLICATIONS_IN_TIME_RANGE_PATH}&environment=${'x'.repeat(length)}`,
          { headers }
        );
        expect(response).toHaveStatusCode(200);
      });
    }
  });
});
