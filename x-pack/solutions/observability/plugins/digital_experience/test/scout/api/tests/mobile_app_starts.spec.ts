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
  BUSY_COLD_START,
  BUSY_RELEASE,
  BUSY_WARM_START,
  MOBILE_APPS,
  TIMESTAMP,
} from '../../common/fixtures/mobile_data';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const { COMMON_HEADERS, TIME_RANGE, mobileAppStartsPath, mobileKpisPath } = testData;

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
        // Every bucket of the range, all the starts in the bucket of their minute
        expect(points.length).toBeGreaterThan(1);
        expect(points.filter(({ cold }) => cold.count > 0)).toStrictEqual([
          {
            timestamp: Date.parse(TIMESTAMP),
            cold: BUSY_COLD_START,
            warm: BUSY_WARM_START,
          },
        ]);
        expect(
          points
            .filter(({ timestamp }) => timestamp !== Date.parse(TIMESTAMP))
            .every(({ cold, warm }) => cold.avg === null && warm.avg === null)
        ).toBe(true);
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
