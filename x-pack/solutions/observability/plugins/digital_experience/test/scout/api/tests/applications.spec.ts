/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { ApplicationsResponse } from '../../../../common/types/applications';
import type { ApplicationOverviewResponse } from '../../../../common/types/overview';
import { findApplication, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';

const localTime = (timestamp: number) => moment.tz(timestamp, testData.NEW_YORK_TIME_ZONE);
const isLocalMidnight = (timestamp: number) => localTime(timestamp).format('HH:mm') === '00:00';
const isLocalMidnightOrNoon = (timestamp: number) =>
  ['00:00', '12:00'].includes(localTime(timestamp).format('HH:mm'));

const {
  ACROSS_DAYLIGHT_SAVING,
  NEW_YORK_TIME_ZONE,
  OVERVIEW_PATH,
  THIRTY_DAYS,
  withQuery,
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

  apiTest(
    'buckets the page loads over time by 12 hours in the time zone',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(
        withQuery(APPLICATIONS_PATH, { ...THIRTY_DAYS, timeZone: NEW_YORK_TIME_ZONE }),
        { headers: { ...COMMON_HEADERS, ...cookieHeader }, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      const { applications, pageLoadsOverTime } = response.body as ApplicationsResponse;
      expect(pageLoadsOverTime.interval).toStrictEqual({ value: 43200, unit: 's' });
      expect(pageLoadsOverTime.otel.length).toBeGreaterThan(0);
      expect(
        pageLoadsOverTime.otel.every(({ timestamp }) => isLocalMidnightOrNoon(timestamp))
      ).toBe(true);

      const bucketed = pageLoadsOverTime.otel.reduce((sum, { count }) => sum + count, 0);
      const total = applications
        .filter(({ source }) => source === 'otel')
        .reduce((sum, { pageLoads }) => sum + pageLoads.count, 0);
      expect(bucketed).toBe(total);
    }
  );

  apiTest(
    'buckets the page loads over time by local days across a daylight saving change',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(
        withQuery(APPLICATIONS_PATH, { ...ACROSS_DAYLIGHT_SAVING, timeZone: NEW_YORK_TIME_ZONE }),
        { headers: { ...COMMON_HEADERS, ...cookieHeader }, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      const { pageLoadsOverTime } = response.body as ApplicationsResponse;
      expect(pageLoadsOverTime.interval).toStrictEqual({ value: 1, unit: 'd' });
      expect(pageLoadsOverTime.otel.every(({ timestamp }) => isLocalMidnight(timestamp))).toBe(
        true
      );
      // 2021-03-14 has 23 hours in New York.
      const hours = pageLoadsOverTime.otel
        .slice(1)
        .map(
          ({ timestamp }, index) => (timestamp - pageLoadsOverTime.otel[index].timestamp) / 36e5
        );
      expect(hours).toContain(23);
    }
  );

  apiTest('buckets the Overview trend in the time zone', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

    const response = await apiClient.get(
      withQuery(OVERVIEW_PATH, { ...THIRTY_DAYS, timeZone: NEW_YORK_TIME_ZONE }),
      { headers: { ...COMMON_HEADERS, ...cookieHeader }, responseType: 'json' }
    );

    expect(response).toHaveStatusCode(200);
    const { trend, trendInterval } = (response.body as ApplicationOverviewResponse).overview;
    expect(trendInterval).toStrictEqual({ value: 43200, unit: 's' });
    expect(trend.length).toBeGreaterThan(0);
    expect(trend.every(({ timestamp }) => isLocalMidnightOrNoon(timestamp))).toBe(true);
  });

  apiTest('returns 400 for an unknown time zone', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
    const headers = { ...COMMON_HEADERS, ...cookieHeader };

    const response = await apiClient.get(`${APPLICATIONS_IN_TIME_RANGE_PATH}&timeZone=Not/AZone`, {
      headers,
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('buckets in UTC without a time zone', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

    const response = await apiClient.get(withQuery(APPLICATIONS_PATH, THIRTY_DAYS), {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const { pageLoadsOverTime } = response.body as ApplicationsResponse;
    expect(pageLoadsOverTime.otel.length).toBeGreaterThan(0);
    expect(
      pageLoadsOverTime.otel.every(({ timestamp }) => timestamp % (12 * 60 * 60 * 1000) === 0)
    ).toBe(true);
  });
});
