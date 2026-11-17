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
import { testData } from '../fixtures';
import { LOCAL_PAGE_LOADS, expectedCountsByKey } from '../../common/fixtures/time_zone_data';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';

const {
  ACROSS_DAYLIGHT_SAVING,
  APPLICATIONS_IN_TIME_RANGE_PATH,
  APPLICATIONS_PATH,
  COMMON_HEADERS,
  NEW_YORK_TIME_ZONE,
  OVERVIEW_PATH,
  THIRTY_DAYS,
  TIME_ZONE_ENVIRONMENT,
  withQuery,
} = testData;

const localTime = (timestamp: number) => moment.tz(timestamp, NEW_YORK_TIME_ZONE);
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

apiTest.describe(
  'Digital Experience histogram buckets in the time zone',
  { tag: DIGITAL_EXPERIENCE_TAGS },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.core.settings(FLAG_ON_OVERRIDE);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.core.settings(FLAG_RESET_OVERRIDE);
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
        expect(pageLoadsOverTime.otel.every(({ timestamp }) => isBucketStart(timestamp))).toBe(
          true
        );
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

      const response = await apiClient.get(
        `${APPLICATIONS_IN_TIME_RANGE_PATH}&timeZone=Not/AZone`,
        {
          headers,
        }
      );

      expect(response).toHaveStatusCode(400);
    });
  }
);
