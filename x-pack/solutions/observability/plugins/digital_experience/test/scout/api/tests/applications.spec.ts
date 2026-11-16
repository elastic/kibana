/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { ApplicationsResponse, TimeSeriesPoint } from '../../../../common/types/applications';
import type { ApplicationOverviewResponse } from '../../../../common/types/overview';
import { findApplication, testData } from '../fixtures';
import { LOCAL_PAGE_LOADS, expectedCountsByKey } from '../../common/fixtures/time_zone_data';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';

const localTime = (timestamp: number) => moment.tz(timestamp, testData.NEW_YORK_TIME_ZONE);
const isLocalMidnight = (timestamp: number) => localTime(timestamp).format('HH:mm') === '00:00';
const isLocalMidnightOrNoon = (timestamp: number) =>
  ['00:00', '12:00'].includes(localTime(timestamp).format('HH:mm'));

const HALF_DAY_MS = 12 * 60 * 60 * 1000;

/** Every bucket counts the page loads `expected` has for its key, the rest none. */
const expectCounts = (points: TimeSeriesPoint[], expected: Map<number, number>) => {
  expect(
    points.filter(({ timestamp }) => {
      return expected.has(timestamp);
    })
  ).toHaveLength(expected.size);
  for (const { timestamp, count } of points) {
    expect(count).toBe(expected.get(timestamp) ?? 0);
  }
};

const {
  ACROSS_DAYLIGHT_SAVING,
  NEW_YORK_TIME_ZONE,
  OVERVIEW_PATH,
  THIRTY_DAYS,
  TIME_ZONE_ENVIRONMENT,
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

  const TIME_ZONE_CASES = [
    {
      buckets: '12 hours from local midnight and noon in the time zone',
      range: THIRTY_DAYS,
      timeZone: NEW_YORK_TIME_ZONE,
      interval: { value: 43200, unit: 's' },
      isBucketStart: isLocalMidnightOrNoon,
      expectedCounts: expectedCountsByKey(LOCAL_PAGE_LOADS.halfDays),
    },
    {
      buckets: 'local days across a daylight saving change',
      range: ACROSS_DAYLIGHT_SAVING,
      timeZone: NEW_YORK_TIME_ZONE,
      interval: { value: 1, unit: 'd' },
      isBucketStart: isLocalMidnight,
      expectedCounts: expectedCountsByKey(LOCAL_PAGE_LOADS.days),
    },
    {
      // The same page loads as the first case, split 2 + 1 at UTC noon instead of 1 + 2.
      buckets: '12 hours from UTC midnight and noon without a time zone',
      range: THIRTY_DAYS,
      timeZone: undefined,
      interval: { value: 43200, unit: 's' },
      isBucketStart: (timestamp: number) => timestamp % HALF_DAY_MS === 0,
      expectedCounts: new Map([
        [Date.parse('2021-01-10T12:00:00.000Z'), 2],
        [Date.parse('2021-01-11T00:00:00.000Z'), 1],
      ]),
    },
  ];

  for (const {
    buckets,
    range,
    timeZone,
    interval,
    isBucketStart,
    expectedCounts,
  } of TIME_ZONE_CASES) {
    apiTest(`counts the page loads by ${buckets}`, async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(
        withQuery(APPLICATIONS_PATH, {
          ...range,
          ...(timeZone ? { timeZone } : {}),
          environment: TIME_ZONE_ENVIRONMENT,
        }),
        { headers: { ...COMMON_HEADERS, ...cookieHeader }, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      const { pageLoadsOverTime } = response.body as ApplicationsResponse;
      expect(pageLoadsOverTime.histogram).toStrictEqual({
        interval,
        start: Date.parse(range.start),
        end: Date.parse(range.end),
      });
      expect(pageLoadsOverTime.otel.every(({ timestamp }) => isBucketStart(timestamp))).toBe(true);
      expectCounts(pageLoadsOverTime.otel, expectedCounts);
    });
  }

  apiTest('buckets the Overview trend in the time zone', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

    const response = await apiClient.get(
      withQuery(OVERVIEW_PATH, { ...THIRTY_DAYS, timeZone: NEW_YORK_TIME_ZONE }),
      { headers: { ...COMMON_HEADERS, ...cookieHeader }, responseType: 'json' }
    );

    expect(response).toHaveStatusCode(200);
    const { trend, trendHistogram } = (response.body as ApplicationOverviewResponse).overview;
    expect(trendHistogram).toStrictEqual({
      interval: { value: 43200, unit: 's' },
      start: Date.parse(THIRTY_DAYS.start),
      end: Date.parse(THIRTY_DAYS.end),
    });
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
});
