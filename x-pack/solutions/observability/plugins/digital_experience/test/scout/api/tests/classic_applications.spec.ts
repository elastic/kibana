/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { ApplicationsResponse } from '../../../../common/types/applications';
import { findApplication, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_WITH_UX_TAGS } from '../../tags';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';

const {
  APPLICATIONS_IN_TIME_RANGE_PATH,
  APPLICATIONS_PATH,
  COMMON_HEADERS,
  NEW_YORK_TIME_ZONE,
  SERVICE_NAME,
  THIRTY_DAYS,
  withQuery,
} = testData;

apiTest.describe(
  'Digital Experience applications API with Classic RUM data',
  { tag: DIGITAL_EXPERIENCE_WITH_UX_TAGS },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.core.settings(FLAG_ON_OVERRIDE);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.core.settings(FLAG_RESET_OVERRIDE);
    });

    apiTest('returns the metrics of a Classic RUM application', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(APPLICATIONS_IN_TIME_RANGE_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const { applications } = response.body as ApplicationsResponse;
      const classic = findApplication(applications, SERVICE_NAME, 'classic');
      // The archive has page loads and errors but no external spans, so no HTTP requests.
      expect(classic).toMatchObject({
        pageLoads: { count: 524 },
        webVitals: {
          lcp: { sampleCount: 388 },
          inp: { p75Ms: null, sampleCount: 0, ratings: null },
          cls: { sampleCount: 451 },
          fcp: { sampleCount: 433 },
          ttfb: { sampleCount: 512 },
        },
        jsErrors: { count: 2846 },
        httpRequests: { count: 0, failedRatio: null },
      });
      expect(classic?.jsErrors.perPageLoad).toBeCloseTo(5.43);

      // Percentiles over many samples are approximate: durations within 50 ms, CLS within 0.005.
      expect(classic?.webVitals.lcp.p75Ms).toBeCloseTo(3026.5, -2);
      expect(classic?.webVitals.cls.p75).toBeCloseTo(0.019, 2);
      expect(classic?.webVitals.fcp.p75Ms).toBeCloseTo(2262, -2);
      expect(classic?.webVitals.ttfb.p75Ms).toBeCloseTo(927.5, -2);
    });

    apiTest(
      'buckets both sources on the same keys, at local midnight and noon',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(
          withQuery(APPLICATIONS_PATH, { ...THIRTY_DAYS, timeZone: NEW_YORK_TIME_ZONE }),
          { headers: { ...COMMON_HEADERS, ...cookieHeader }, responseType: 'json' }
        );

        expect(response).toHaveStatusCode(200);
        const { otel, classic } = (response.body as ApplicationsResponse).pageLoadsOverTime;
        const classicKeys = classic.map(({ timestamp }) => timestamp);
        expect(classicKeys.length).toBeGreaterThan(0);
        expect(otel.map(({ timestamp }) => timestamp)).toStrictEqual(classicKeys);
        expect(
          classicKeys.every((timestamp) =>
            ['00:00', '12:00'].includes(moment.tz(timestamp, NEW_YORK_TIME_ZONE).format('HH:mm'))
          )
        ).toBe(true);
      }
    );
  }
);
