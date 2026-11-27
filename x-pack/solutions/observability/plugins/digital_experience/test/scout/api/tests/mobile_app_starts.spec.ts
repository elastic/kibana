/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { MobileAppStartsResponse, MobileKpisResponse } from '../../../../common/types/mobile';
import {
  BOUNDARY_COLD_START,
  BOUNDARY_PREVIOUS_COLD_START,
  BOUNDARY_TIMESTAMPS,
  BUSY_COLD_START,
  BUSY_RELEASE,
  BUSY_WARM_START,
  BUSY_WARM_START_ENVIRONMENT,
  MOBILE_APPS,
  TIMESTAMP,
} from '../../common/fixtures/mobile_data';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const {
  COMMON_HEADERS,
  NEW_YORK_TIME_ZONE,
  THIRTY_DAYS,
  TIME_RANGE,
  mobileAppStartsPath,
  mobileKpisPath,
} = testData;

const NO_STARTS = { avg: null, count: 0 };

apiTest.describe(
  'Digital Experience mobile app starts API',
  { tag: DIGITAL_EXPERIENCE_TAGS },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.core.settings(FLAG_ON_OVERRIDE);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.core.settings(FLAG_RESET_OVERRIDE);
    });

    apiTest(
      'averages the cold and warm starts in the KPIs, without the background launch nor the hot start',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(mobileKpisPath(MOBILE_APPS.busyAndroid), {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const { coldStart, warmStart } = response.body as MobileKpisResponse;
        // Nothing in the previous period
        expect(coldStart).toStrictEqual({
          value: BUSY_COLD_START.avg,
          previous: null,
          delta: null,
          count: BUSY_COLD_START.count,
          previousCount: 0,
        });
        expect(warmStart).toStrictEqual({
          value: BUSY_WARM_START.avg,
          previous: null,
          delta: null,
          count: BUSY_WARM_START.count,
          previousCount: 0,
        });
      }
    );

    apiTest(
      'compares the starts with the previous period, the guard limits included and nothing on the range end',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(mobileKpisPath(MOBILE_APPS.boundaryAndroid), {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const { coldStart, warmStart } = response.body as MobileKpisResponse;
        // 0 ms and 60 s count, a negative start and one without a duration don't
        expect(coldStart).toStrictEqual({
          value: BOUNDARY_COLD_START.avg,
          previous: BOUNDARY_PREVIOUS_COLD_START.avg,
          delta: BOUNDARY_COLD_START.avg - BOUNDARY_PREVIOUS_COLD_START.avg,
          count: BOUNDARY_COLD_START.count,
          previousCount: BOUNDARY_PREVIOUS_COLD_START.count,
        });
        expect(warmStart).toMatchObject({ value: null, count: 0, previousCount: 0 });
      }
    );

    apiTest(
      'charts only the starts of the time range, not those of the previous period nor its end',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(mobileAppStartsPath(MOBILE_APPS.boundaryAndroid), {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const { points } = response.body as MobileAppStartsResponse;
        expect(points.filter(({ cold }) => cold.count > 0)).toStrictEqual([
          {
            timestamp: Date.parse(BOUNDARY_TIMESTAMPS.start),
            cold: BOUNDARY_COLD_START,
            warm: NO_STARTS,
          },
        ]);
      }
    );

    apiTest(
      'has no average for an application whose SDK sent no app starts',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(mobileKpisPath(MOBILE_APPS.reactNative), {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const { coldStart, warmStart } = response.body as MobileKpisResponse;
        [coldStart, warmStart].forEach((start) =>
          expect(start).toMatchObject({ value: null, count: 0 })
        );
      }
    );

    apiTest(
      'answers the cold and warm starts per bucket, a gap where there were none',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(mobileAppStartsPath(MOBILE_APPS.busyAndroid), {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const { points, histogram } = response.body as MobileAppStartsResponse;
        expect(histogram).toMatchObject({
          start: Date.parse(TIME_RANGE.rangeFrom),
          end: Date.parse(TIME_RANGE.rangeTo),
        });
        // Every bucket of the range in order, the starts in the bucket of their minute, the
        // others empty: no starts and no average, so the charts leave a gap
        expect(histogram.interval.unit).toBe('s');
        const intervalMs = histogram.interval.value * 1000;
        expect(points).toStrictEqual(
          Array.from(
            { length: (histogram.end - histogram.start) / intervalMs },
            (_, index) => histogram.start + index * intervalMs
          ).map((timestamp) =>
            timestamp === Date.parse(TIMESTAMP)
              ? { timestamp, cold: BUSY_COLD_START, warm: BUSY_WARM_START }
              : { timestamp, cold: NO_STARTS, warm: NO_STARTS }
          )
        );
      }
    );

    apiTest(
      "lines the buckets up with the user's time zone, the populated one in place of its empty one",
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(
          mobileAppStartsPath(MOBILE_APPS.busyAndroid, {
            start: THIRTY_DAYS.start,
            end: THIRTY_DAYS.end,
            timeZone: NEW_YORK_TIME_ZONE,
          }),
          { headers: { ...COMMON_HEADERS, ...cookieHeader }, responseType: 'json' }
        );

        expect(response).toHaveStatusCode(200);
        const { histogram, points } = response.body as MobileAppStartsResponse;
        // 12-hour buckets from New York's midnight and noon (05:00 and 17:00 UTC in January)
        expect(histogram.interval).toStrictEqual({ value: 12 * 60 * 60, unit: 's' });
        const twelveHours = 12 * 60 * 60 * 1000;
        const populated = Date.parse('2021-01-18T05:00:00.000Z');
        // All 60 buckets of the 30 days: the starts' bucket once, not next to an empty one
        expect(points).toStrictEqual(
          Array.from(
            { length: 60 },
            (_, index) => Date.parse(THIRTY_DAYS.start) + index * twelveHours
          ).map((timestamp) =>
            timestamp === populated
              ? { timestamp, cold: BUSY_COLD_START, warm: BUSY_WARM_START }
              : { timestamp, cold: NO_STARTS, warm: NO_STARTS }
          )
        );
      }
    );

    apiTest('respects the OS, release and environment filters', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
      const getAppStarts = async (query: Record<string, string>) => {
        const response = await apiClient.get(mobileAppStartsPath(MOBILE_APPS.busyAndroid, query), {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        return (response.body as MobileAppStartsResponse).points;
      };
      const totalColdStarts = (points: MobileAppStartsResponse['points']) =>
        points.reduce((sum, { cold }) => sum + cold.count, 0);

      expect(totalColdStarts(await getAppStarts({ release: BUSY_RELEASE }))).toBe(
        BUSY_COLD_START.count
      );
      expect(totalColdStarts(await getAppStarts({ osName: 'Android' }))).toBe(
        BUSY_COLD_START.count
      );
      expect(await getAppStarts({ release: '9.9.9' })).toStrictEqual([]);
      expect(await getAppStarts({ osName: 'iOS' })).toStrictEqual([]);
      expect(await getAppStarts({ environment: 'no-such-environment' })).toStrictEqual([]);
      // Only the starts of the environment: the warm ones
      const inEnvironment = await getAppStarts({ environment: BUSY_WARM_START_ENVIRONMENT });
      expect(totalColdStarts(inEnvironment)).toBe(0);
      expect(inEnvironment.reduce((sum, { warm }) => sum + warm.count, 0)).toBe(
        BUSY_WARM_START.count
      );
    });

    apiTest(
      'answers 400 for a range that starts after it ends',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(
          mobileAppStartsPath(MOBILE_APPS.busyAndroid, {
            start: TIME_RANGE.rangeTo,
            end: TIME_RANGE.rangeFrom,
          }),
          { headers: { ...COMMON_HEADERS, ...cookieHeader }, responseType: 'json' }
        );

        expect(response).toHaveStatusCode(400);
      }
    );
  }
);
