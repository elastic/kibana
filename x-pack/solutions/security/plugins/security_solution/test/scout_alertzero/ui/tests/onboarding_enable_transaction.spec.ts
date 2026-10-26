/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID } from '@kbn/alertzero-common';
import { expect } from '@kbn/scout-security/ui';
import {
  createUiOnboardingSpace,
  createWorkerServiceAccount,
  listWorkers,
  ok,
  patchWorker,
  spaceTest,
  tags,
} from '../fixtures';

/**
 * Enable transaction (#19933, #19935, #19932 Sc5 core).
 *
 * "Enable and run" runs a fan-out (ensureWorkerServiceAccounts then one PATCH
 * per worker, allSettled, use_enable_workers.ts): every enabled worker must
 * carry a serviceAccountId, a double-click must not duplicate PATCHes, a
 * rejected PATCH must not block siblings, and disabling later must stick.
 */
spaceTest.describe(
  'AlertZero onboarding - enable transaction',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.setTimeout(240_000);

    /** Advances past the intro and clicks Enable and run. */
    const enableAll = async (page: import('@kbn/scout-security').ScoutPage) => {
      await page.testSubj.locator('alertZeroOnboardingContinueButton').click();
      await expect(page.testSubj.locator('alertZeroOnboardingSelectedCount')).toBeVisible();
      await page.testSubj.locator('alertZeroOnboardingEnableButton').click();
    };

    spaceTest(
      'enable and run gives every enabled worker a service account and lands on the queue',
      async ({ page, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
          withStubModel: true,
        });
        try {
          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));
          await enableAll(page);

          // The queue replaces onboarding after the fan-out settles.
          await expect(page.testSubj.locator('alertZeroProposalsTrendChartRow')).toBeVisible({
            timeout: 120_000,
          });

          const workers = await listWorkers(space.api, space.spaceId);
          const enabled = workers.filter((w) => w.enabled);
          expect(enabled).toHaveLength(workers.length);
          for (const worker of enabled) {
            expect(worker.settings?.serviceAccountId).toBeTruthy();
          }
        } finally {
          await space.cleanup();
        }
      }
    );

    spaceTest(
      'a rapid double click issues exactly one PATCH per worker',
      async ({ page, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
          withStubModel: true,
        });
        try {
          const workers = await listWorkers(space.api, space.spaceId);

          const patchUrls: string[] = [];
          page.on('request', (request) => {
            if (request.method() === 'PATCH' && request.url().includes('/workers/')) {
              patchUrls.push(request.url());
            }
          });

          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));
          await page.testSubj.locator('alertZeroOnboardingContinueButton').click();
          await expect(page.testSubj.locator('alertZeroOnboardingSelectedCount')).toBeVisible();

          const enable = page.testSubj.locator('alertZeroOnboardingEnableButton');
          await enable.click({ noWaitAfter: true });
          await enable.click({ force: true, noWaitAfter: true }).catch(() => undefined);

          await expect(page.testSubj.locator('alertZeroProposalsTrendChartRow')).toBeVisible({
            timeout: 120_000,
          });

          expect(patchUrls).toHaveLength(workers.length);
          expect(new Set(patchUrls).size).toBe(patchUrls.length);
        } finally {
          await space.cleanup();
        }
      }
    );

    spaceTest(
      'a failed PATCH fails open: siblings enable and the UI recovers to the queue',
      async ({ page, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
          withStubModel: true,
        });
        try {
          const workers = await listWorkers(space.api, space.spaceId);
          const [victim] = workers;

          // Drop exactly the victim worker's PATCHes at the network layer.
          await page.route(`**/internal/alertzero/workers/${victim.id}*`, (route) => route.abort());

          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));
          await enableAll(page);

          // Partial failure deliberately holds the onboarding open: LandingPage keeps
          // savingInProgress=true so a partially-committed state cannot transition to the
          // queue before the user retries or leaves (use_enable_workers.ts).
          await expect(page.testSubj.locator('alertZeroOnboardingSelectedCount')).toBeVisible({
            timeout: 120_000,
          });
          await expect(page.testSubj.locator('alertZeroProposalsTrendChartRow')).toBeHidden();
          await expect(page.getByText('Some settings were saved before the error')).toBeVisible({
            timeout: 60_000,
          });

          // Siblings landed; the aborted worker did not.
          const afterFailure = await listWorkers(space.api, space.spaceId);
          expect(afterFailure.filter((w) => w.enabled)).toHaveLength(workers.length - 1);
          expect(afterFailure.find((w) => w.id === victim.id)?.enabled).toBe(false);

          // Retry with the network restored: full success releases the lock and lands
          // on the queue. Dismiss the failure toasts first — they overlay the Enable
          // button and the warning toast is sticky. Handles resolve once, so a toast
          // animating out between clicks cannot be clicked twice.
          await page.unroute(`**/internal/alertzero/workers/${victim.id}*`);
          const dismissButtons = page.getByRole('button', { name: 'Dismiss toast' });
          for (const button of await dismissButtons.all()) {
            await button.click({ timeout: 5_000 }).catch(() => undefined);
          }
          await expect(page.locator('.euiGlobalToastListItem')).toHaveCount(0, {
            timeout: 10_000,
          });
          await page.testSubj.locator('alertZeroOnboardingEnableButton').click();
          await expect(page.testSubj.locator('alertZeroProposalsTrendChartRow')).toBeVisible({
            timeout: 120_000,
          });

          const afterRetry = await listWorkers(space.api, space.spaceId);
          expect(afterRetry.filter((w) => w.enabled)).toHaveLength(workers.length);
        } finally {
          await space.cleanup();
        }
      }
    );

    spaceTest(
      'disabling a worker from Watch settings persists off',
      async ({ page, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
          withStubModel: true,
        });
        try {
          // Seed one enabled worker via the same API shape the UI's save uses.
          const workerId = SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID;
          const workers = await listWorkers(space.api, space.spaceId);
          const target = workers.find((w) => w.id === workerId) ?? workers[0];
          const account = await createWorkerServiceAccount(space.api, target.id);
          ok(
            await patchWorker(space.api, space.spaceId, target.id, {
              enabled: true,
              settingsRevision: target.settingsRevision ?? null,
              settings: { serviceAccountId: account.id },
            }),
            `seed enable ${target.id}`
          );

          await browserAuth.loginAsAdmin();
          // kbnUrl.app() ignores path suffixes, so the watch route is built through
          // get() — the catalog maps alert-triage to the floor watch.
          await page.goto(
            kbnUrl.get(`s/${space.spaceId}/app/alertzero/watches/system-security-watch-floor`)
          );

          // The enabled switch sits on the accordion header band, visible while collapsed.
          const switchEl = page.testSubj.locator(`alertZeroWorkerEnabledSwitch-${target.id}`);
          await expect(switchEl).toBeVisible({ timeout: 60_000 });
          await expect(switchEl).toBeChecked();
          // alert-triage has no dependents, so no confirmation modal intervenes.
          await switchEl.click();
          await expect(switchEl).not.toBeChecked();

          // Watch settings save through an explicit draft; the off state is server-side
          // only after Save.
          const saveButton = page.testSubj.locator('alertZeroWatchSettingsSave');
          await expect(saveButton).toBeEnabled();
          await saveButton.click();
          await expect(page.testSubj.locator('alertZeroWatchUnsavedChangesBadge')).toBeHidden({
            timeout: 30_000,
          });

          const after = await listWorkers(space.api, space.spaceId);
          const disabled = after.find((w) => w.id === target.id);
          expect(disabled?.enabled).toBe(false);
          await account.cleanup();
        } finally {
          await space.cleanup();
        }
      }
    );
  }
);
