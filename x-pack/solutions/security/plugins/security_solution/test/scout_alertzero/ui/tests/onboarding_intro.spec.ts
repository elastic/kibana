/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import {
  ALERTZERO_READ_ONLY_ROLE,
  createUiOnboardingSpace,
  listWorkers,
  spaceTest,
  tags,
} from '../fixtures';

/**
 * Intro step & Continue gating (#19931).
 *
 * The intro renders for anyone who can see the app; Continue requires the
 * AlertZero write privilege (`canWrite = capabilities.alertzero?.write`,
 * onboarding_page.tsx) — without it the button is disabled with a reason, and
 * the step cannot advance. With it, Continue reveals worker selection.
 */
spaceTest.describe(
  'AlertZero onboarding - intro and Continue gating',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.setTimeout(150_000);

    spaceTest(
      'intro promo and UI preview render',
      async ({ page, pageObjects, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces);
        try {
          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));

          const alertZero = pageObjects.alertZeroApp;
          await expect(alertZero.introPromo).toBeVisible();
          await expect(alertZero.uiPreview).toBeVisible();
        } finally {
          await space.cleanup();
        }
      }
    );

    spaceTest(
      'read-only user cannot advance past the intro',
      async ({ page, pageObjects, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces);
        try {
          await browserAuth.loginWithCustomRole(ALERTZERO_READ_ONLY_ROLE);
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));

          const alertZero = pageObjects.alertZeroApp;
          await expect(alertZero.introPromo).toBeVisible();
          await expect(alertZero.continueButton).toBeDisabled();
          await expect(alertZero.continueDisabledReason).toBeVisible();

          // A force-click bypasses Playwright's actionability checks, but the
          // browser still drops clicks on disabled buttons — the step must
          // stay on the intro.
          await alertZero.continueButton.click({ force: true });
          await expect(alertZero.introPromo).toBeVisible();
        } finally {
          await space.cleanup();
        }
      }
    );

    spaceTest(
      'privileged user advances from intro to worker selection',
      async ({ page, pageObjects, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces);
        try {
          const workers = await listWorkers(space.api, space.spaceId);
          expect(workers.length).toBeGreaterThan(0);

          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));

          // Worker cards only exist on the workers step, not the intro.
          const alertZero = pageObjects.alertZeroApp;
          await expect(alertZero.workerCard(workers[0].id)).toBeHidden();

          await alertZero.advanceToWorkerSelection();

          await expect(alertZero.workerCard(workers[0].id)).toBeVisible();
        } finally {
          await space.cleanup();
        }
      }
    );
  }
);
