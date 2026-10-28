/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { ApplicationsResponse } from '../../../../common/types/applications';
import { findApplication, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_WITH_UX_TAGS } from '../../tags';

const { APPLICATIONS_IN_TIME_RANGE_PATH, COMMON_HEADERS, SERVICE_NAME } = testData;

apiTest.describe(
  'Digital Experience applications API with Classic RUM data',
  { tag: DIGITAL_EXPERIENCE_WITH_UX_TAGS },
  () => {
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
  }
);
