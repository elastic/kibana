/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import type { ScoutPage } from '@kbn/scout-security';
import { createUiOnboardingSpace, listWorkers, spaceTest, tags } from '../fixtures';

/**
 * No-model blocking (#19932 scenario 4 + #19955).
 *
 * The stub model is space-scoped: a space without `seedStubModel` is the
 * genuine no-model state even on this stub-server. Every worker reports
 * `blockingReasons: ['no_model']`, the onboarding page locks its controls, and
 * the escape hatch to Feature Settings stays reachable from two surfaces.
 *
 * The "configure a model → controls unlock" flow needs EIS and lives with the
 * EIS layer (follow-up tracked in ROUTE_MAP item 7).
 */
spaceTest.describe(
  'AlertZero onboarding - no-model blocking',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.setTimeout(120_000);

    /**
     * Advances past the intro and waits for the worker-selection step. Call
     * `page.goto(kbnUrl.app('alertzero', { space }))` before this.
     */
    const advanceToWorkers = async (page: ScoutPage): Promise<void> => {
      await page.testSubj.locator('alertZeroOnboardingContinueButton').click();
      await expect(page.testSubj.locator('alertZeroOnboardingSelectedCount')).toBeVisible();
    };

    spaceTest(
      'no-model callout renders and locks worker controls',
      async ({ page, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
          withStubModel: false,
        });
        try {
          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));
          await advanceToWorkers(page);

          // The callout is the page's own statement of the lock; its action
          // opens Feature Settings in a new tab.
          const callout = page.testSubj.locator('alertZeroOnboardingNoModelCallout');
          await expect(callout).toBeVisible();
          await expect(
            page.testSubj.locator('alertZeroOnboardingNoModelFeatureSettingsButton')
          ).toBeVisible();

          // Every worker toggle and the Enable button are locked by `isModelMissing`.
          const workers = await listWorkers(space.api, space.spaceId);
          for (const worker of workers) {
            await expect(
              page.testSubj.locator(`alertZeroOnboardingWorkerToggle-${worker.id}`)
            ).toBeDisabled();
          }
          await expect(page.testSubj.locator('alertZeroOnboardingEnableButton')).toBeDisabled();

          // NEGATIVE CONTROL (restored): with a model present the same controls
          // are usable. Run the twin space WITH the stub model and assert the
          // unlock — proves the lock above is the no-model state, not a generic
          // disabled state.
          const withModel = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
            withStubModel: true,
          });
          try {
            await page.goto(kbnUrl.app('alertzero', { space: withModel.spaceId }));
            await advanceToWorkers(page);
            for (const worker of workers) {
              await expect(
                page.testSubj.locator(`alertZeroOnboardingWorkerToggle-${worker.id}`)
              ).toBeEnabled();
            }
            await expect(page.testSubj.locator('alertZeroOnboardingEnableButton')).toBeEnabled();
            await expect(page.testSubj.locator('alertZeroOnboardingNoModelCallout')).toBeHidden();
          } finally {
            await withModel.cleanup();
          }
        } finally {
          await space.cleanup();
        }
      }
    );

    spaceTest(
      'feature-settings escape hatch links to the management page',
      async ({ page, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
          withStubModel: false,
        });
        try {
          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));
          await advanceToWorkers(page);

          // Two surfaces name Feature Settings on this page: the selection
          // description link and the no-model callout action. Both must open
          // Stack Management > Feature Settings (deep link `model_settings`).
          for (const selector of [
            'alertZeroOnboardingFeatureSettingsLink',
            'alertZeroOnboardingNoModelFeatureSettingsButton',
          ]) {
            await expect(page.testSubj.locator(selector)).toHaveAttribute(
              'href',
              /\/management\/.+model_settings/
            );
          }
        } finally {
          await space.cleanup();
        }
      }
    );
  }
);
