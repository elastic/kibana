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
import { findMobileApplication, testData } from '../fixtures';
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
      'returns a row per mobile application, with its platforms and EDOT as its source',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(APPLICATIONS_IN_TIME_RANGE_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const { applications, mobileAvailability } = response.body as ApplicationsResponse;
        expect(mobileAvailability).toBe('complete');
        for (const expected of EXPECTED_MOBILE_ROWS) {
          expect(findMobileApplication(applications, expected.serviceName)).toMatchObject({
            ...expected,
            source: 'otel',
            // A crash isn't defined yet, so there is not enough data.
            crashFreeSessions: { value: null, previous: null, delta: null },
          });
        }
      }
    );

    apiTest(
      'never lists a backend Java service, nor EDOT Browser on an iPhone, as mobile',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(APPLICATIONS_IN_TIME_RANGE_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const { applications } = response.body as ApplicationsResponse;
        const mobileNames = applications
          .filter(({ applicationType }) => applicationType === 'mobile')
          .map(({ serviceName }) => serviceName);
        expect(mobileNames).not.toContain(MOBILE_APPS.backendJava);
        expect(mobileNames).not.toContain(MOBILE_APPS.browserOnIphone);
      }
    );

    apiTest(
      'answers the KPIs of a mobile application, all platforms or one OS, and lists its OS names',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
        const getKpis = async (query: Record<string, string>) => {
          const response = await apiClient.get(
            `internal/digital_experience/mobile_applications/${encodeURIComponent(
              MOBILE_APPS.reactNative
            )}/kpis?${new URLSearchParams({
              start: TIME_RANGE.rangeFrom,
              end: TIME_RANGE.rangeTo,
              ...query,
            })}`,
            { headers: { ...COMMON_HEADERS, ...cookieHeader }, responseType: 'json' }
          );
          expect(response).toHaveStatusCode(200);
          return response.body as MobileKpisResponse;
        };

        const all = await getKpis({});
        expect(all).toMatchObject({
          hasData: true,
          sessions: { value: 4 },
          users: { value: 3 },
          errorRate: { value: 0.25 },
          releases: ['1.0.0'],
          platforms: ['android', 'ios'],
        });
        expect([...all.osNames].sort()).toStrictEqual(['Android', 'iOS', 'iPadOS']);
        // The OS filter narrows the KPIs, not the OS names.
        const android = await getKpis({ osName: 'Android' });
        expect(android).toMatchObject({
          sessions: { value: 2 },
          users: { value: 1 },
          errorRate: { value: 0.5 },
        });
        expect(android.osNames).toHaveLength(3);
        expect((await getKpis({ osName: 'iPadOS' })).sessions.value).toBe(1);
        expect((await getKpis({ release: '1.0.0' })).sessions.value).toBe(4);
        expect((await getKpis({ release: '9.9.9' })).hasData).toBe(false);
      }
    );
  }
);
