/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { ApplicationsResponse } from '../../../../common/types/applications';
import type { MobileKpisResponse } from '../../../../common/types/mobile';
import { EXPECTED_MOBILE_ROWS, MOBILE_APPS } from '../../common/fixtures/mobile_data';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';
import { findApplication, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const { APPLICATIONS_IN_TIME_RANGE_PATH, COMMON_HEADERS, TIME_RANGE } = testData;

apiTest.describe(
  'Digital Experience applications API with mobile data',
  { tag: DIGITAL_EXPERIENCE_TAGS },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.core.settings(FLAG_ON_OVERRIDE);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.core.settings(FLAG_RESET_OVERRIDE);
    });

    apiTest(
      'returns the mobile applications with their metrics, sorted by sessions',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(APPLICATIONS_IN_TIME_RANGE_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const { applications } = response.body as ApplicationsResponse;
        const reactNative = findApplication(applications, MOBILE_APPS.reactNative, 'mobile');
        const android = findApplication(applications, MOBILE_APPS.android, 'mobile');
        expect(reactNative).toMatchObject({
          ...EXPECTED_MOBILE_ROWS[MOBILE_APPS.reactNative],
          // A crash isn't defined yet, so there is not enough data.
          crashFreeSessions: { value: null, previous: null, delta: null },
        });
        expect(android).toMatchObject(EXPECTED_MOBILE_ROWS[MOBILE_APPS.android]);

        const mobileNames = applications
          .filter(({ source }) => source === 'mobile')
          .map(({ serviceName }) => serviceName);
        expect(mobileNames.indexOf(MOBILE_APPS.reactNative)).toBeLessThan(
          mobileNames.indexOf(MOBILE_APPS.android)
        );
      }
    );

    apiTest('never lists a backend Java service as mobile', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(APPLICATIONS_IN_TIME_RANGE_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      const { applications } = response.body as ApplicationsResponse;
      expect(applications.some(({ serviceName }) => serviceName === MOBILE_APPS.backendJava)).toBe(
        false
      );
    });

    apiTest(
      'answers the KPIs of a mobile application, with one release for every build of it',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
        const kpisPath = (query: Record<string, string> = {}) =>
          `internal/digital_experience/mobile_applications/${encodeURIComponent(
            MOBILE_APPS.reactNative
          )}/kpis?${new URLSearchParams({
            start: TIME_RANGE.rangeFrom,
            end: TIME_RANGE.rangeTo,
            ...query,
          })}`;
        const getKpis = async (query?: Record<string, string>) => {
          const response = await apiClient.get(kpisPath(query), {
            headers: { ...COMMON_HEADERS, ...cookieHeader },
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
          return response.body as MobileKpisResponse;
        };

        // One release on both platforms, whatever their builds (`app.build_id`).
        const all = await getKpis();
        expect(all).toMatchObject({
          hasData: true,
          sessions: { value: 3 },
          users: { value: 2 },
          platforms: ['android', 'ios'],
          releases: ['1.0.0'],
        });

        const release = await getKpis({ release: '1.0.0' });
        expect(release.sessions.value).toBe(3);

        const ios = await getKpis({ platform: 'ios' });
        expect(ios.sessions.value).toBe(1);

        const otherRelease = await getKpis({ release: '9.9.9' });
        expect(otherRelease.hasData).toBe(false);
      }
    );
  }
);
