/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  tags,
} from '../fixtures';

/**
 * Live self-check for the reset fixture. Dirty state is created for real and the
 * reset must clear it; the `z_` prefix runs it last, so it checks the fixture the
 * earlier specs already used rather than gating them. The pure helpers
 * (`spaceUrl`, `isWorkerEnableBlocked`, `ok`) are covered by Jest in
 * `server/threat_intel/scout_alertzero_fixtures.test.ts`.
 */
apiTest.describe(
  'AlertZero onboarding - reset fixture self-check',
  { tag: [...tags.stateful.classic] },
  () => {
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
