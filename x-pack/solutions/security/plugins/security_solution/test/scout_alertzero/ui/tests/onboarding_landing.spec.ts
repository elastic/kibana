/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTZERO_WORKERS_URL } from '@kbn/alertzero-common';
import { expect } from '@kbn/scout-security/ui';
import type { KibanaRole } from '@kbn/scout-security';
import {
  ALERTZERO_READ_ONLY_ROLE,
  createApiFromKbnClient,
  createUiOnboardingSpace,
  createWorkerServiceAccount,
  listWorkers,
  ok,
  patchWorker,
  spaceUrl,
  spaceTest,
  tags,
  type OnboardingSpace,
} from '../fixtures';

/**
 * Landing & access (#19930, #19935 per-space setting).
 *
 * What "renders" means on each branch (verified against this tree):
 * - gate on + no enabled worker → OnboardingPage intro step (`alertZeroOnboardingIntroPromo`)
 * - gate on + enabled worker → ConversationsPage queue (`alertZeroProposalsTrendChartRow`,
 *   rendered unconditionally on the queue and never on onboarding)
 * - gate off → `AppStatus.inaccessible`, so core's AppNotFound screen — not the app
 * - read-only (alertzero:read) user → intro renders, but Continue is disabled with a reason
 */
spaceTest.describe(
  'AlertZero onboarding - landing and access',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.setTimeout(150_000);

    /** Enables one worker through the same API shape the onboarding UI's save uses. */
    const enableFirstWorker = async (space: OnboardingSpace): Promise<() => Promise<void>> => {
      const workers = await listWorkers(space.api, space.spaceId);
      const target = workers[0];
      const account = await createWorkerServiceAccount(space.api, target.id);
      ok(
        await patchWorker(space.api, space.spaceId, target.id, {
          enabled: true,
          settingsRevision: target.settingsRevision ?? null,
          settings: { serviceAccountId: account.id },
        }),
        `enable ${target.id}`
      );
      return account.cleanup;
    };

    spaceTest(
      'all workers off renders onboarding, not the queue or a gate',
      async ({ page, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
          withStubModel: true,
        });
        try {
          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));

          await expect(page.testSubj.locator('alertZeroOnboardingIntroPromo')).toBeVisible();
          await expect(page.testSubj.locator('alertzeroPrivilegesGate')).toBeHidden();
          await expect(page.testSubj.locator('appNotFoundPageContent')).toBeHidden();
        } finally {
          await space.cleanup();
        }
      }
    );

    spaceTest(
      'an enabled worker lands on the queue instead of onboarding',
      async ({ page, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
          withStubModel: true,
        });
        let cleanupAccount: (() => Promise<void>) | undefined;
        try {
          cleanupAccount = await enableFirstWorker(space);

          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));

          await expect(page.testSubj.locator('alertZeroProposalsTrendChartRow')).toBeVisible();
          await expect(page.testSubj.locator('alertZeroOnboardingIntroPromo')).toBeHidden();
        } finally {
          if (cleanupAccount) await cleanupAccount();
          await space.cleanup();
        }
      }
    );

    spaceTest(
      'reload keeps the queue once a worker is enabled',
      async ({ page, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
          withStubModel: true,
        });
        let cleanupAccount: (() => Promise<void>) | undefined;
        try {
          cleanupAccount = await enableFirstWorker(space);

          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));
          await expect(page.testSubj.locator('alertZeroProposalsTrendChartRow')).toBeVisible();

          await page.reload();

          await expect(page.testSubj.locator('alertZeroProposalsTrendChartRow')).toBeVisible();
          await expect(page.testSubj.locator('alertZeroOnboardingIntroPromo')).toBeHidden();
        } finally {
          if (cleanupAccount) await cleanupAccount();
          await space.cleanup();
        }
      }
    );

    spaceTest(
      'read-only user sees onboarding with Continue disabled and a reason',
      async ({ page, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces);
        try {
          // alertzero:read without write — the role has access to the app but
          // cannot advance past the intro step.
          const role: KibanaRole = ALERTZERO_READ_ONLY_ROLE;
          await browserAuth.loginWithCustomRole(role);
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));

          await expect(page.testSubj.locator('alertZeroOnboardingIntroPromo')).toBeVisible();
          const continueButton = page.testSubj.locator('alertZeroOnboardingContinueButton');
          await expect(continueButton).toBeVisible();
          await expect(continueButton).toBeDisabled();
          await expect(
            page.testSubj.locator('alertZeroOnboardingContinueDisabledReason')
          ).toBeVisible();
        } finally {
          await space.cleanup();
        }
      }
    );

    spaceTest(
      'space with the per-space setting off hides the app and 404s worker routes (#19935)',
      async ({ page, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        // Created directly (not via createUiOnboardingSpace) so the gate stays off.
        const spaceId = `scout-onb-off-${Date.now().toString(36)}`;
        await apiServices.spaces.create({ id: spaceId, name: `Onboarding off ${spaceId}` });
        try {
          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: spaceId }));

          // The setting off marks the app inaccessible, so core renders its
          // not-found screen instead of mounting AlertZero.
          await expect(page.testSubj.locator('appNotFoundPageContent')).toBeVisible();

          // Server side, every worker route is gated by the same setting.
          const api = createApiFromKbnClient(kbnClient);
          const workers = await api.internal('GET', spaceUrl(ALERTZERO_WORKERS_URL, spaceId));
          expect(workers.statusCode).toBe(404);
        } finally {
          await apiServices.spaces.delete(spaceId);
        }
      }
    );
  }
);
