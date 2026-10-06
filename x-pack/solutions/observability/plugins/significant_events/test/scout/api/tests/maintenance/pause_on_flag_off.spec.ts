/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as delay } from 'timers/promises';
import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import { MAINTENANCE_FEATURE_FLAG_ACTOR } from '../../../../../common/maintenance/actors';
import { NIGHTSHIFT_FLAG_SETTLE_MS } from '../../../../../server/lib/maintenance/when_nightshift_turns_off';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS, PUBLIC_API_HEADERS } from '../../fixtures/constants';

const STATUS_ENDPOINT = 'internal/significant_events/maintenance/_status';
const AVAILABILITY_ENDPOINT = 'internal/significant_events/availability';
// A managed workflow installed as soon as Significant Events is available.
const WORKFLOW_ENDPOINT = 'api/workflows/workflow/system-significant-events-discovery';
// The flag-off pause runs only after the flag value settles, plus, on Cloud, the ~10s config
// poll that carries the override to every node.
const POLL_OPTIONS = { timeout: 45_000, intervals: [1_000] };

apiTest.describe(
  'Pause when Nightshift is turned off',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, apiServices }) => {
      ({ cookieHeader } = await samlAuth.asStreamsAdmin());
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
        // Waits for workflow installation plus the flag settle window, beyond the 60s default.
        apiTest.setTimeout(120_000);
        const internalHeaders = { ...COMMON_API_HEADERS, ...cookieHeader };
        const getMaintenance = async () => {
          const response = await apiClient.get(STATUS_ENDPOINT, {
            headers: internalHeaders,
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
          return { state: response.body.state, updatedBy: response.body.updatedBy };
        };
        const isWorkflowEnabled = async () => {
          const response = await apiClient.get(WORKFLOW_ENDPOINT, {
            headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
            responseType: 'json',
          });
          return response.statusCode === 200 ? response.body.enabled : undefined;
        };

        expect((await getMaintenance()).state).toBe('enabled');
        // Installation is asynchronous, so wait until the workflow is installed and running.
        await expect.poll(isWorkflowEnabled, POLL_OPTIONS).toBe(true);
        // A flip only counts once the previous value has held for the settle window, and
        // global setup turned the flag on moments ago.
        await delay(NIGHTSHIFT_FLAG_SETTLE_MS + 1_000);

        await apiServices.significantEventsTest.disableSignificantEvents();
        // The status route stays reachable while the flag is off.
        await expect
          .poll(getMaintenance, POLL_OPTIONS)
          .toStrictEqual({ state: 'paused', updatedBy: MAINTENANCE_FEATURE_FLAG_ACTOR });
        // The state reads `paused` as soon as the pause is claimed, before the sweep ends.
        await expect.poll(isWorkflowEnabled, POLL_OPTIONS).toBe(false);

        await apiServices.significantEventsTest.enableSignificantEvents();
        await expect
          .poll(async () => {
            const response = await apiClient.get(AVAILABILITY_ENDPOINT, {
              headers: internalHeaders,
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
