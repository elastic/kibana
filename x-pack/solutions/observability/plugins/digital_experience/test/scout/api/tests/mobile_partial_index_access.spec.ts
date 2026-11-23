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
import { MOBILE_APPS } from '../../common/fixtures/mobile_data';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';
import { findMobileApplication, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const { APPLICATIONS_IN_TIME_RANGE_PATH, COMMON_HEADERS, createRole, mobileKpisPath } = testData;

/** Reads the OTel traces but not the logs, which hold most of the mobile events. */
const NO_OTEL_LOGS_ROLE = {
  ...createRole({ digital_experience: ['read'], apm: ['read'] }),
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['traces-*.otel-*'], privileges: ['read'] }],
  },
};

/** The same role, with the OTel logs too. */
const OTEL_LOGS_AND_TRACES_ROLE = {
  ...NO_OTEL_LOGS_ROLE,
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['logs-*.otel-*', 'traces-*.otel-*'], privileges: ['read'] }],
  },
};

apiTest.describe(
  'Digital Experience mobile APIs with partial index access',
  { tag: DIGITAL_EXPERIENCE_TAGS },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.core.settings(FLAG_ON_OVERRIDE);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.core.settings(FLAG_RESET_OVERRIDE);
    });

    apiTest(
      'reports the mobile applications as partial, counted from the traces only',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(NO_OTEL_LOGS_ROLE);

        const response = await apiClient.get(APPLICATIONS_IN_TIME_RANGE_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const { applications, mobileAvailability } = response.body as ApplicationsResponse;
        expect(mobileAvailability).toBe('partial');
        // Of its 4 sessions, an Android one and the iPad one have a span.
        expect(findMobileApplication(applications, MOBILE_APPS.reactNative)).toMatchObject({
          sessions: { count: 2 },
        });
      }
    );

    apiTest(
      'reports the KPIs of a mobile application as partial, counted from the traces only',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(NO_OTEL_LOGS_ROLE);

        const response = await apiClient.get(mobileKpisPath(MOBILE_APPS.reactNative), {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body as MobileKpisResponse).toMatchObject({
          isPartial: true,
          hasData: true,
          sessions: { value: 2 },
        });
      }
    );

    apiTest(
      'reports the KPIs as partial without data when all of the application is in unreadable indices',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(NO_OTEL_LOGS_ROLE);

        // Its one event is a log.
        const response = await apiClient.get(mobileKpisPath(MOBILE_APPS.legacyAndroid), {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body as MobileKpisResponse).toMatchObject({
          isPartial: true,
          hasData: false,
        });
      }
    );

    apiTest(
      'reports the KPIs of the same application with data once the logs are readable',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(OTEL_LOGS_AND_TRACES_ROLE);

        const response = await apiClient.get(mobileKpisPath(MOBILE_APPS.legacyAndroid), {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body as MobileKpisResponse).toMatchObject({
          isPartial: false,
          hasData: true,
          sessions: { value: 1 },
        });
      }
    );
  }
);
