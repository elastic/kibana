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
import {
  deleteOwnedSessions,
  ingestOwnedSessionsAt,
  setUpOwnedSessions,
  type OwnedSessions,
  type OwnedSessionsSetup,
} from '../../common/fixtures/sessions_data';
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
  THIRTY_DAYS,
  TIME_ZONE_APP,
  withQuery,
} = testData;

const TIME_ZONE_OVERVIEW_PATH = `${APPLICATIONS_PATH}/${TIME_ZONE_APP}/overview`;

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

// In their own environment, so the list reads only them.
const SESSIONS: OwnedSessions = {
  idPrefix: 'dx-time-zone',
  environment: 'sessions-time-zone-test',
  count: 3,
};

apiTest.describe(
  'Digital Experience histogram buckets in the time zone',
  { tag: DIGITAL_EXPERIENCE_TAGS },
  () => {
    let setup: OwnedSessionsSetup | undefined;
    // Sessions are kept for 30 days, so theirs are around a recent New York midnight: 30 days
    // ending at the next one get 12-hour buckets, as `THIRTY_DAYS` does.
    const lastMidnight = moment.tz(NEW_YORK_TIME_ZONE).startOf('day');
    const sessionsDay = lastMidnight.clone().subtract(5, 'days');
    const at = (hour: number, minute: number) =>
      sessionsDay.clone().set({ hour, minute }).valueOf();
    const sessionStarts = [at(11, 59), at(12, 0), at(23, 59)];
    const sessionsRange = {
      start: lastMidnight.clone().add(1, 'day').subtract(30, 'days').toISOString(),
      end: lastMidnight.clone().add(1, 'day').toISOString(),
    };

    apiTest.beforeAll(async ({ apiServices, esClient, kbnClient }) => {
      await apiServices.core.settings(FLAG_ON_OVERRIDE);
      setup = await setUpOwnedSessions(esClient, kbnClient);
      await ingestOwnedSessionsAt(esClient, SESSIONS, sessionStarts);
    });

    apiTest.afterAll(async ({ apiServices, esClient, kbnClient }) => {
      await deleteOwnedSessions(esClient, kbnClient, SESSIONS, setup);
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
      apiTest(`counts the Overview page loads by ${buckets}`, async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(
          withQuery(TIME_ZONE_OVERVIEW_PATH, {
            ...range,
            ...(timeZone ? { timeZone } : {}),
          }),
          { headers: { ...COMMON_HEADERS, ...cookieHeader }, responseType: 'json' }
        );

        expect(response).toHaveStatusCode(200);
        const { trend, trendHistogram } = (response.body as ApplicationOverviewResponse).overview;
        expect(trendHistogram).toStrictEqual({
          interval,
          start: Date.parse(range.start),
          end: Date.parse(range.end),
        });
        const points = trend.map(({ timestamp, pageLoads }) => ({
          timestamp,
          count: pageLoads,
        }));
        expect(points.every(({ timestamp }) => isBucketStart(timestamp))).toBe(true);
        expectCounts(points, expectedCounts);
      });
    }

    apiTest(
      'counts the page loads of the sessions by 12 hours from local midnight and noon',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(
          withQuery(APPLICATIONS_PATH, {
            ...sessionsRange,
            timeZone: NEW_YORK_TIME_ZONE,
            environment: SESSIONS.environment,
          }),
          { headers: { ...COMMON_HEADERS, ...cookieHeader }, responseType: 'json' }
        );

        expect(response).toHaveStatusCode(200);
        const { pageLoadsOverTime } = response.body as ApplicationsResponse;
        expect(pageLoadsOverTime.histogram.interval).toStrictEqual({ value: 43200, unit: 's' });
        expect(
          pageLoadsOverTime.otel.every(({ timestamp }) => isLocalMidnightOrNoon(timestamp))
        ).toBe(true);
        expectCounts(
          pageLoadsOverTime.otel,
          new Map([
            [at(0, 0), 1],
            [at(12, 0), 2],
          ])
        );
      }
    );

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
