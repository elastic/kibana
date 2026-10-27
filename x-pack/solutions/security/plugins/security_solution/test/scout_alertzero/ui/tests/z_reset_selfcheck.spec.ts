/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0; you may not use this file except in compliance with the Elastic
 * License 2.0.
 */

import { ALERTZERO_WORKERS_URL } from '@kbn/alertzero-common';
import { expect } from '@kbn/scout-security/api';
import {
  apiTest,
  createOnboardingSpace,
  createWorkerServiceAccount,
  isWorkerEnableBlocked,
  listWorkers,
  ok,
  patchWorker,
  resetOnboardingState,
  spaceUrl,
  tags,
} from '../fixtures';

/**
 * Live self-check for the reset fixture and the pure helpers. Everything later
 * specs assume about `resetOnboardingState` and `seedStubModel` is proven here
 * first: dirty state is created for real, the reset clears it, and the
 * assertions are the ones the negative control (documented in the plan) breaks.
 */
apiTest.describe(
  'AlertZero onboarding - reset fixture self-check',
  { tag: [...tags.stateful.classic] },
  () => {
    apiTest('pure helpers: spaceUrl namespacing, isWorkerEnableBlocked, ok', async () => {
      expect(spaceUrl(ALERTZERO_WORKERS_URL, 'default')).toBe(ALERTZERO_WORKERS_URL);
      expect(spaceUrl(ALERTZERO_WORKERS_URL, 'space-1')).toBe(`/s/space-1${ALERTZERO_WORKERS_URL}`);
      expect(isWorkerEnableBlocked({ blockingReasons: ['no_model'] })).toBe(true);
      expect(isWorkerEnableBlocked({ blockingReasons: ['other'] })).toBe(false);
      expect(isWorkerEnableBlocked({})).toBe(false);
      expect(ok({ statusCode: 200, body: { workers: [] } }, 't')).toStrictEqual({ workers: [] });
      expect(() => ok({ statusCode: 404, body: {} }, 't')).toThrow(/404/);
    });

    apiTest(
      'stub clears no_model; enable persists; reset disables every worker',
      async ({ apiClient, samlAuth, apiServices }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const space = await createOnboardingSpace(apiClient, apiServices.spaces, cookieHeader, {
          withStubModel: true,
        });

        try {
          // Precondition: with the stub assigned, no worker reports no_model.
          const workers = await listWorkers(space.api, space.spaceId);
          expect(workers.length).toBeGreaterThan(0);
          for (const worker of workers) {
            expect(isWorkerEnableBlocked(worker)).toBe(false);
          }

          // Dirty: enable two workers with throwaway accounts (the UI flow's API shape).
          // The accounts are cluster-scoped and survive space deletion, so their cleanup
          // runs from a finally even when a step below fails — not off the success path.
          const targets = workers.slice(0, 2);
          const accounts: Array<() => Promise<void>> = [];
          try {
            for (const worker of targets) {
              const account = await createWorkerServiceAccount(space.api, worker.id);
              accounts.push(account.cleanup);
              ok(
                await patchWorker(space.api, space.spaceId, worker.id, {
                  enabled: true,
                  settingsRevision: worker.settingsRevision ?? null,
                  settings: { serviceAccountId: account.id },
                }),
                `enable ${worker.id}`
              );
            }
            let after = await listWorkers(space.api, space.spaceId);
            expect(after.filter((w) => w.enabled).length).toBeGreaterThanOrEqual(2);

            // Reset.
            await resetOnboardingState(space.api, space.spaceId);

            after = await listWorkers(space.api, space.spaceId);
            expect(after.filter((w) => w.enabled)).toStrictEqual([]);
          } finally {
            for (const cleanupAccount of accounts) await cleanupAccount().catch(() => undefined);
          }
        } finally {
          await space.cleanup();
        }
      }
    );
  }
);
