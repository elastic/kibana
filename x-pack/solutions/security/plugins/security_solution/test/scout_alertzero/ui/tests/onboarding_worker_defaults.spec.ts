/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import {
  createUiOnboardingSpace,
  listWorkers,
  spaceTest,
  tags,
  type WorkerInfo,
} from '../fixtures';

/**
 * Worker defaults & no-save-until-click (#19932 scenario 1).
 *
 * Toggle state is client-only (`useWorkerSelection` initializes every catalog
 * worker on and never syncs from the server), so leaving the page without
 * clicking "Enable and run" must persist nothing. The minimum-one guard
 * (`toggleWorker` early-returns at `enabledCount <= 1`) keeps the last toggle
 * on even against `force` clicks.
 */
spaceTest.describe(
  'AlertZero onboarding - worker defaults and no-save',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.setTimeout(150_000);

    /** Advances past the intro and waits for the worker-selection step. */
    const advanceToWorkers = async (page: import('@kbn/scout-security/ui').Page) => {
      await page.testSubj.locator('alertZeroOnboardingContinueButton').click();
      await expect(page.testSubj.locator('alertZeroOnboardingSelectedCount')).toBeVisible();
    };

    const countTogglesOn = async (
      page: import('@kbn/scout-security/ui').Page,
      workers: WorkerInfo[]
    ): Promise<number> => {
      let on = 0;
      for (const worker of workers) {
        const toggle = page.testSubj.locator(`alertZeroOnboardingWorkerToggle-${worker.id}`);
        if (await toggle.isChecked()) on += 1;
      }
      return on;
    };

    spaceTest(
      'every worker is selected by default',
      async ({ page, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
          withStubModel: true,
        });
        try {
          const workers = await listWorkers(space.api, space.spaceId);
          expect(workers.length).toBeGreaterThan(0);

          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));
          await advanceToWorkers(page);

          expect(await countTogglesOn(page, workers)).toBe(workers.length);
          await expect(page.testSubj.locator('alertZeroOnboardingSelectedCount')).toHaveText(
            `${workers.length} of ${workers.length} Workers selected`
          );
        } finally {
          await space.cleanup();
        }
      }
    );

    spaceTest(
      'toggles do not persist when navigating away before Enable',
      async ({ page, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
          withStubModel: true,
        });
        try {
          const workers = await listWorkers(space.api, space.spaceId);
          const [first, second] = workers;
          expect(workers.length).toBeGreaterThan(1);

          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));
          await advanceToWorkers(page);

          // Turn one off, leave without saving, come back.
          await page.testSubj.locator(`alertZeroOnboardingWorkerToggle-${first.id}`).click();
          await expect(
            page.testSubj.locator(`alertZeroOnboardingWorkerToggle-${first.id}`)
          ).not.toBeChecked();

          await page.goto(kbnUrl.app('security', { space: space.spaceId }));
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));
          await advanceToWorkers(page);

          // Defaults are back — and server state was never touched.
          expect(await countTogglesOn(page, workers)).toBe(workers.length);
          const serverWorkers = await listWorkers(space.api, space.spaceId);
          expect(serverWorkers.filter((w) => w.enabled)).toStrictEqual([]);
          void second;
        } finally {
          await space.cleanup();
        }
      }
    );

    spaceTest(
      'the minimum-one guard keeps the last worker selected',
      async ({ page, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
          withStubModel: true,
        });
        try {
          const workers = await listWorkers(space.api, space.spaceId);
          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));
          await advanceToWorkers(page);

          // Turn all but one off.
          for (const worker of workers.slice(1)) {
            await page.testSubj.locator(`alertZeroOnboardingWorkerToggle-${worker.id}`).click();
            await expect(
              page.testSubj.locator(`alertZeroOnboardingWorkerToggle-${worker.id}`)
            ).not.toBeChecked();
          }
          const last = workers[0];
          const lastToggle = page.testSubj.locator(`alertZeroOnboardingWorkerToggle-${last.id}`);

          // The toggle is disabled, and even a forced click cannot clear it.
          await expect(lastToggle).toBeDisabled();
          await lastToggle.click({ force: true });
          await expect(lastToggle).toBeChecked();
          await expect(page.testSubj.locator('alertZeroOnboardingSelectedCount')).toHaveText(
            `1 of ${workers.length} Workers selected`
          );
        } finally {
          await space.cleanup();
        }
      }
    );

    spaceTest(
      'enable footer shows the CTA copy and helper links',
      async ({ page, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
          withStubModel: true,
        });
        try {
          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));
          await advanceToWorkers(page);

          await expect(page.testSubj.locator('alertZeroOnboardingEnableButton')).toBeVisible();
          await expect(page.testSubj.locator('alertZeroOnboardingEnableButton')).toHaveText(
            'Enable and run'
          );
          await expect(page.testSubj.locator('alertZeroOnboardingReadMoreLink')).toBeVisible();
          await expect(page.testSubj.locator('alertZeroOnboardingWatchSettingsLink')).toBeVisible();
        } finally {
          await space.cleanup();
        }
      }
    );
  }
);
