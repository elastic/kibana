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
import type { AlertZeroAppPage } from '../fixtures/page_objects/alertzero_app_page';

/**
 * Worker defaults & no-save-until-click (#19932 scenario 1).
 *
 * Toggle state is client-only (`useWorkerSelection` initializes every catalog
 * worker on and never syncs from the server), so leaving the page without
 * clicking "Enable and run" must persist nothing. The minimum-one guard
 * (`toggleWorker` early-returns at `enabledCount <= 1`) is client-only too and
 * is covered by the Jest/RTL tests (`use_worker_selection.test.ts`,
 * `onboarding_page.test.tsx` "disables a toggle when it is the last enabled
 * worker") rather than a browser test.
 */
spaceTest.describe(
  'AlertZero onboarding - worker defaults and no-save',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.setTimeout(150_000);

    const countTogglesOn = async (
      alertZero: AlertZeroAppPage,
      workers: WorkerInfo[]
    ): Promise<number> => {
      let on = 0;
      for (const worker of workers) {
        if (await alertZero.workerToggle(worker.id).isChecked()) on += 1;
      }
      return on;
    };

    spaceTest(
      'every worker is selected by default',
      async ({ page, pageObjects, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
          withStubModel: true,
        });
        try {
          const workers = await listWorkers(space.api, space.spaceId);
          expect(workers.length).toBeGreaterThan(0);

          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));
          const alertZero = pageObjects.alertZeroApp;
          await alertZero.advanceToWorkerSelection();

          expect(await countTogglesOn(alertZero, workers)).toBe(workers.length);
          await expect(alertZero.selectedCount).toHaveText(
            `${workers.length} of ${workers.length} Workers selected`
          );
        } finally {
          await space.cleanup();
        }
      }
    );

    spaceTest(
      'toggles do not persist when navigating away before Enable',
      async ({ page, pageObjects, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
          withStubModel: true,
        });
        try {
          const workers = await listWorkers(space.api, space.spaceId);
          const [first] = workers;
          expect(workers.length).toBeGreaterThan(1);

          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));
          const alertZero = pageObjects.alertZeroApp;
          await alertZero.advanceToWorkerSelection();

          // Turn one off, leave without saving, come back.
          await alertZero.workerToggle(first.id).click();
          await expect(alertZero.workerToggle(first.id)).not.toBeChecked();

          await page.goto(kbnUrl.app('security', { space: space.spaceId }));
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));
          await alertZero.advanceToWorkerSelection();

          // Defaults are back — and server state was never touched.
          expect(await countTogglesOn(alertZero, workers)).toBe(workers.length);
          const serverWorkers = await listWorkers(space.api, space.spaceId);
          expect(serverWorkers.filter((w) => w.enabled)).toStrictEqual([]);
        } finally {
          await space.cleanup();
        }
      }
    );

    spaceTest(
      'enable footer shows the CTA copy and helper links',
      async ({ page, pageObjects, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
          withStubModel: true,
        });
        try {
          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));
          const alertZero = pageObjects.alertZeroApp;
          await alertZero.advanceToWorkerSelection();

          await expect(alertZero.enableButton).toBeVisible();
          await expect(alertZero.enableButton).toHaveText('Enable and run');
          await expect(alertZero.readMoreLink).toBeVisible();
          await expect(alertZero.watchSettingsLink).toBeVisible();
        } finally {
          await space.cleanup();
        }
      }
    );
  }
);
