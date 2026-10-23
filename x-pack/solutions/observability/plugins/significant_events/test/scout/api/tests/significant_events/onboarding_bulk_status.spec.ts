/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import { v4 as uuidv4 } from 'uuid';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';

const BULK_STATUS_ENDPOINT = 'internal/streams/onboarding/_bulk_status';
// On Cloud a flag override only applies on the node that served the PUT; the others pick it up
// through core's ~10s dynamic config poll.
const FLAG_PROPAGATION_POLL_OPTIONS = { timeout: 45_000, intervals: [1_000] };

apiTest.describe(
  'Onboarding bulk status API',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // Streams + availability are owned by global.setup.ts / global.teardown.ts for the whole run.
    // Per-test enable/disable below is intentional for the 403 denial path only.

    apiTest(
      'returns not_started for every requested source id that has never been onboarded',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();

        const sourceIds = [uuidv4(), uuidv4()];

        const response = await apiClient.post(BULK_STATUS_ENDPOINT, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: { sourceIds },
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);
        // The response always contains an entry for every requested source id.
        expect(Object.keys(response.body).sort()).toStrictEqual([...sourceIds].sort());
        for (const sourceId of sourceIds) {
          expect(response.body[sourceId]).toStrictEqual({
            status: 'not_started',
            executionId: null,
          });
        }
      }
    );

    apiTest('rejects an empty sourceIds array', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const response = await apiClient.post(BULK_STATUS_ENDPOINT, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: { sourceIds: [] },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(400);
    });

    apiTest(
      'returns 403 when significant events is disabled',
      async ({ apiClient, samlAuth, apiServices }) => {
        apiTest.setTimeout(120_000);
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const sourceIds = [uuidv4()];

        await apiServices.significantEventsTest.disableSignificantEvents();

        try {
          await expect
            .poll(
              async () => {
                const response = await apiClient.post(BULK_STATUS_ENDPOINT, {
                  headers: { ...COMMON_API_HEADERS, ...cookieHeader },
                  body: { sourceIds },
                  responseType: 'json',
                });
                return response.statusCode;
              },
              {
                ...FLAG_PROPAGATION_POLL_OPTIONS,
                message: 'the bulk status endpoint is denied while the flag is off',
              }
            )
            .toBe(403);
        } finally {
          await apiServices.significantEventsTest.enableSignificantEvents();
          // Flag-off pauses every space and turning the flag back on does not resume.
          await apiServices.significantEventsTest.resumeSignificantEvents();
        }
      }
    );
  }
);
