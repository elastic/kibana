/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_WORKERS_URL,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
} from '@kbn/alertzero-common';
import { expect } from '@kbn/scout-security/api';
import { apiTest, enableAlertZeroInSpace, tags, TI_HEADERS } from '../fixtures';

/**
 * No-model blocking, API half (#19932 scenario 4 + #19955). This case never
 * touches the browser or asserts rendering — it only proves the GET-workers
 * endpoint reports `blockingReasons: ['no_model']` in a space with no inference
 * endpoint assigned — so it lives here behind scoped session authentication
 * instead of paying for the UI job's browser lifecycle. The rendering half
 * (callout, locked controls, escape hatch) stays in the UI suite.
 */
apiTest.describe(
  'AlertZero onboarding - no-model blocking (API)',
  { tag: [...tags.stateful.classic] },
  () => {
    apiTest(
      'every worker reports the no_model blocking reason',
      async ({ apiClient, apiServices, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const headers = { ...TI_HEADERS, ...cookieHeader };
        const spaceId = `scout-onb-api-nomodel-${Date.now().toString(36)}`;
        await apiServices.spaces.create({ id: spaceId, name: spaceId });
        try {
          await enableAlertZeroInSpace({ apiClient, headers, spaceId });

          const res = await apiClient.get(`/s/${spaceId}${ALERTZERO_WORKERS_URL}`, {
            headers,
            responseType: 'json',
          });
          expect(res.statusCode).toBe(200);

          // Shaped from the route response: every catalog worker (at minimum
          // the alert-triage floor) is present and blocked by no_model.
          const { workers } = res.body as {
            workers: Array<{ id: string; blockingReasons?: string[] }>;
          };
          expect(workers.length).toBeGreaterThan(0);
          expect(workers.map((w) => w.id)).toContain(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID);
          for (const worker of workers) {
            expect(worker.blockingReasons).toContain('no_model');
          }
        } finally {
          await apiServices.spaces.delete(spaceId);
        }
      }
    );
  }
);
