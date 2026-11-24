/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { MobileReleasesResponse } from '../../../../common/types/mobile';
import { EARLIER_TIMESTAMP, MOBILE_APPS, TIMESTAMP } from '../../common/fixtures/mobile_data';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const { COMMON_HEADERS, TIME_RANGE, mobileReleasesPath } = testData;

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
    // `build-b` is first indexed before `build-a`, each marked at its document's time.
    expect((response.body as MobileReleasesResponse).markers).toStrictEqual([
      { release: 'build-b', firstSeen: Date.parse(EARLIER_TIMESTAMP) },
      { release: 'build-a', firstSeen: Date.parse(TIMESTAMP) },
    ]);
  });

  apiTest(
    'names the top 5 releases by sessions and groups the rest as one Other row, each session once',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(mobileReleasesPath(MOBILE_APPS.android), {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const { releases, series } = response.body as MobileReleasesResponse;
      // Seven releases: 2.9.0 has two sessions; the other six share one session, so the ties go
      // by release, highest first, and 2.10.0 and 2.010.0 are left for "Other".
      const named = releases.filter(({ isOther }) => !isOther);
      expect(named[0]).toStrictEqual({
        release: '2.9.0',
        isOther: false,
        sessions: 2,
        users: 2,
        errorRate: null,
      });
      expect(new Set(named.map(({ release }) => release))).toStrictEqual(
        new Set(['2.9.0', 'v3.0.0', 'debug', '3.0.0-beta', '3.0.0+45'])
      );
      // One row last, with the session of both releases counted once
      expect(releases).toHaveLength(6);
      expect(releases[5]).toStrictEqual({
        release: '',
        isOther: true,
        sessions: 1,
        users: 1,
        errorRate: null,
      });
      expect(series.map(({ isOther }) => isOther)).toStrictEqual([
        false,
        false,
        false,
        false,
        false,
        true,
      ]);
    }
  );

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
