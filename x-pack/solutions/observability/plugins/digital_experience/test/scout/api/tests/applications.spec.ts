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
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';

const {
  APM_ONLY_ROLE,
  APPLICATIONS_IN_HTTP_ONLY_TIME_RANGE_PATH,
  APPLICATIONS_IN_TIME_RANGE_PATH,
  APPLICATIONS_IN_TRACE_ONLY_TIME_RANGE_PATH,
  APPLICATIONS_PATH,
  COMMON_HEADERS,
  DIGITAL_EXPERIENCE_ONLY_ROLE,
  DIGITAL_EXPERIENCE_READ_ROLE,
  OTEL_APPS,
  SERVICE_NAME,
  STAGING_ENVIRONMENT,
  TIME_RANGE,
  TRACE_ONLY_APPS,
  TRACE_ONLY_TIME_RANGE,
  withQuery,
} = testData;

apiTest.describe('Digital Experience applications API', { tag: DIGITAL_EXPERIENCE_TAGS }, () => {
  apiTest.beforeAll(async ({ apiServices }) => {
    await apiServices.core.settings(FLAG_ON_OVERRIDE);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.core.settings(FLAG_RESET_OVERRIDE);
  });

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
        pageLoads: { count: 5 },
        webVitals: {
          lcp: { p75Ms: 2412.5, sampleCount: 1, ratings: { good: 1 } },
          inp: { p75Ms: 143.5, sampleCount: 1, ratings: { good: 1 } },
          cls: { sampleCount: 1, ratings: { good: 1 } },
          fcp: { p75Ms: 1650.5, sampleCount: 1, ratings: { good: 1 } },
          ttfb: { p75Ms: 950.25, sampleCount: 1, ratings: { needsImprovement: 1 } },
        },
        jsErrors: { count: 1, perPageLoad: 0.2 },
        // The four successful requests and the failed one the Overview details list.
        httpRequests: { count: 5, failedCount: 1, failedRatio: 0.2 },
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
    'lists the EDOT Browser applications that only have HTTP requests in the time range',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(APPLICATIONS_IN_HTTP_ONLY_TIME_RANGE_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const { applications } = response.body as ApplicationsResponse;
      const noPageLoads = {
        pageLoads: { count: 0 },
        jsErrors: { count: 0, perPageLoad: null },
        webVitals: { lcp: { p75Ms: null, sampleCount: 0 } },
      };

      expect(findApplication(applications, OTEL_APPS.shop, 'otel')).toMatchObject({
        ...noPageLoads,
        environments: ['production'],
        httpRequests: { count: 4, failedCount: 0, failedRatio: 0 },
        lastSeen: '2021-01-18T12:33:00.000Z',
      });
      expect(findApplication(applications, OTEL_APPS.checkout, 'otel')).toMatchObject({
        ...noPageLoads,
        environments: ['production'],
        httpRequests: { count: 4, failedCount: 1, failedRatio: 0.25 },
        lastSeen: '2021-01-18T12:33:30.000Z',
      });
    }
  );

  apiTest(
    'offers only the trace-only environments whose requests list an application',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
      const { withRequests, withoutOutcome } = TRACE_ONLY_APPS;

      const response = await apiClient.get(APPLICATIONS_IN_TRACE_ONLY_TIME_RANGE_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const { applications, environments } = response.body as ApplicationsResponse;
      expect(environments).toContain(withRequests.environment);
      // Its only span has no outcome, so picking it would list nothing.
      expect(environments).not.toContain(withoutOutcome.environment);

      expect(findApplication(applications, withRequests.serviceName, 'otel')).toMatchObject({
        environments: [withRequests.environment],
        pageLoads: { count: 0 },
        httpRequests: { count: 1, failedCount: 0, failedRatio: 0 },
      });
      expect(applications.map(({ serviceName }) => serviceName)).not.toContain(
        withoutOutcome.serviceName
      );
    }
  );

  apiTest(
    'lists only the applications of the trace-only environment it offers',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
      const { withRequests } = TRACE_ONLY_APPS;
      // Covers both ranges, so another application is listed without the filter.
      const range = { start: TIME_RANGE.rangeFrom, end: TRACE_ONLY_TIME_RANGE.rangeTo };
      const listApplications = async (environment?: string) => {
        const response = await apiClient.get(
          withQuery(APPLICATIONS_PATH, { ...range, ...(environment ? { environment } : {}) }),
          { headers: { ...COMMON_HEADERS, ...cookieHeader }, responseType: 'json' }
        );
        expect(response).toHaveStatusCode(200);
        return response.body as ApplicationsResponse;
      };

      // The picker offers it even though the range also has logs.
      const { applications: unfiltered, environments } = await listApplications();
      expect(environments).toContain(withRequests.environment);
      expect(findApplication(unfiltered, withRequests.serviceName, 'otel')).toBeDefined();
      expect(findApplication(unfiltered, OTEL_APPS.shop, 'otel')).toBeDefined();

      const { applications: filtered } = await listApplications(withRequests.environment);
      expect(findApplication(filtered, withRequests.serviceName, 'otel')).toMatchObject({
        environments: [withRequests.environment],
        httpRequests: { count: 1, failedCount: 0, failedRatio: 0 },
      });
      expect(findApplication(filtered, OTEL_APPS.shop, 'otel')).toBeUndefined();
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
