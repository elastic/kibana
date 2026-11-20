/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { ApplicationsResponse } from '../../../../common/types/applications';
import { EXPECTED_MOBILE_ROWS, MOBILE_APPS } from '../../common/fixtures/mobile_data';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';
import { findApplication, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const { APPLICATIONS_IN_TIME_RANGE_PATH, COMMON_HEADERS } = testData;

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
  }
);
