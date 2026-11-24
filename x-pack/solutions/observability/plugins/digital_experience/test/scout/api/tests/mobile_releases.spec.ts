/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { MobileReleasesResponse } from '../../../../common/types/mobile';
import { MOBILE_APPS } from '../../common/fixtures/mobile_data';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const { COMMON_HEADERS, DIGITAL_EXPERIENCE_ONLY_ROLE, TIME_RANGE, mobileReleasesPath } = testData;

apiTest.describe('Digital Experience mobile releases API', { tag: DIGITAL_EXPERIENCE_TAGS }, () => {
  apiTest.beforeAll(async ({ apiServices }) => {
    await apiServices.core.settings(FLAG_ON_OVERRIDE);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.core.settings(FLAG_RESET_OVERRIDE);
  });

  apiTest(
    'answers the releases of an application with their sessions, users and error rate, and where they first appear',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(mobileReleasesPath(MOBILE_APPS.reactNative), {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const { releases, series, markers, histogram } = response.body as MobileReleasesResponse;
      // Four sessions, below the floor of 100 for an error rate.
      expect(releases).toStrictEqual([
        { release: '1.0.0', isOther: false, sessions: 4, users: 3, errorRate: null },
      ]);
      expect(series.map(({ release }) => release)).toStrictEqual(['1.0.0']);
      expect(series[0].points.reduce((sum, { sessions }) => sum + sessions, 0)).toBeGreaterThan(0);
      expect(markers.map(({ release }) => release)).toStrictEqual(['1.0.0']);
      expect(histogram).toMatchObject({
        start: Date.parse(TIME_RANGE.rangeFrom),
        end: Date.parse(TIME_RANGE.rangeTo),
      });
    }
  );

  apiTest('marks each release at its first document, in order', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

    const response = await apiClient.get(mobileReleasesPath(MOBILE_APPS.nightlyAndroid), {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const { markers } = response.body as MobileReleasesResponse;
    // `build-b` is first indexed before `build-a`.
    expect(markers.map(({ release }) => release)).toStrictEqual(['build-b', 'build-a']);
  });

  apiTest('respects the release and environment filters', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
    const getReleases = async (query: Record<string, string>) => {
      const response = await apiClient.get(mobileReleasesPath(MOBILE_APPS.reactNative, query), {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return response.body as MobileReleasesResponse;
    };

    expect((await getReleases({ release: '1.0.0' })).releases).toHaveLength(1);
    expect((await getReleases({ release: '9.9.9' })).releases).toStrictEqual([]);
    expect((await getReleases({ environment: 'no-such-environment' })).releases).toStrictEqual([]);
  });

  apiTest('answers 403 without the APM privilege', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(DIGITAL_EXPERIENCE_ONLY_ROLE);

    const response = await apiClient.get(mobileReleasesPath(MOBILE_APPS.reactNative), {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(403);
  });

  apiTest('answers 400 for a range that starts after it ends', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

    const response = await apiClient.get(
      mobileReleasesPath(MOBILE_APPS.reactNative, {
        start: TIME_RANGE.rangeTo,
        end: TIME_RANGE.rangeFrom,
      }),
      { headers: { ...COMMON_HEADERS, ...cookieHeader }, responseType: 'json' }
    );

    expect(response).toHaveStatusCode(400);
  });
});
