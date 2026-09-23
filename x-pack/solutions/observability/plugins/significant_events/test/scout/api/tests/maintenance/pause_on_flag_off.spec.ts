/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import { MAINTENANCE_FEATURE_FLAG_ACTOR } from '../../../../../common/maintenance/actors';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';

const STATUS_ENDPOINT = 'internal/significant_events/maintenance/_status';
const AVAILABILITY_ENDPOINT = 'internal/significant_events/availability';
// The flag-off pause runs asynchronously after the override lands (and, on Cloud, after the
// ~10s config poll reaches every node).
const POLL_OPTIONS = { timeout: 30_000, intervals: [1_000] };

apiTest.describe(
  'Pause when Nightshift is turned off',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, apiServices }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      headers = { ...COMMON_API_HEADERS, ...cookieHeader };
      // An earlier flag flip in this run may have left the deployment paused.
      await apiServices.significantEventsTest.resumeSignificantEvents();
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.significantEventsTest.enableSignificantEvents();
      await apiServices.significantEventsTest.resumeSignificantEvents();
    });

    apiTest(
      'pauses when the flag is turned off and stays paused when it is turned back on',
      async ({ apiClient, apiServices }) => {
        const getMaintenance = async () => {
          const response = await apiClient.get(STATUS_ENDPOINT, { headers, responseType: 'json' });
          expect(response).toHaveStatusCode(200);
          return { state: response.body.state, updatedBy: response.body.updatedBy };
        };

        expect((await getMaintenance()).state).toBe('enabled');

        await apiServices.significantEventsTest.disableSignificantEvents();
        // The status route stays reachable while the flag is off.
        await expect
          .poll(getMaintenance, POLL_OPTIONS)
          .toStrictEqual({ state: 'paused', updatedBy: MAINTENANCE_FEATURE_FLAG_ACTOR });

        await apiServices.significantEventsTest.enableSignificantEvents();
        await expect
          .poll(async () => {
            const response = await apiClient.get(AVAILABILITY_ENDPOINT, {
              headers,
              responseType: 'json',
            });
            return response.body.available;
          }, POLL_OPTIONS)
          .toBe(true);
        expect(await getMaintenance()).toStrictEqual({
          state: 'paused',
          updatedBy: MAINTENANCE_FEATURE_FLAG_ACTOR,
        });
      }
    );
  }
);
