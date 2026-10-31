/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
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

    spaceTest(
      'no-model callout renders and locks worker controls',
      async ({ page, pageObjects, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
          withStubModel: false,
        });
        try {
          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));
          const alertZero = pageObjects.alertZeroApp;
          await alertZero.advanceToWorkerSelection();

          // The callout is the page's own statement of the lock; its action
          // opens Feature Settings in a new tab.
          await expect(alertZero.noModelCallout).toBeVisible();
          await expect(alertZero.noModelFeatureSettingsButton).toBeVisible();

          // Every worker toggle and the Enable button are locked by `isModelMissing`.
          const workers = await listWorkers(space.api, space.spaceId);
          for (const worker of workers) {
            await expect(alertZero.workerToggle(worker.id)).toBeDisabled();
          }
          await expect(alertZero.enableButton).toBeDisabled();

          // With a model present the same controls are usable. Run the twin
          // space WITH the stub model and assert the unlock — proves the lock
          // above is the no-model state, not a generic disabled state.
          const withModel = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
            withStubModel: true,
          });
          try {
            await page.goto(kbnUrl.app('alertzero', { space: withModel.spaceId }));
            await alertZero.advanceToWorkerSelection();
            for (const worker of workers) {
              await expect(alertZero.workerToggle(worker.id)).toBeEnabled();
            }
            await expect(alertZero.enableButton).toBeEnabled();
            await expect(alertZero.noModelCallout).toBeHidden();
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
      async ({ page, pageObjects, browserAuth, kbnUrl, kbnClient, apiServices }) => {
        const space = await createUiOnboardingSpace(kbnClient, apiServices.spaces, {
          withStubModel: false,
        });
        try {
          await browserAuth.loginAsAdmin();
          await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));
          const alertZero = pageObjects.alertZeroApp;
          await alertZero.advanceToWorkerSelection();

          // Two surfaces name Feature Settings on this page: the selection
          // description link and the no-model callout action. Both must open
          // Stack Management > Feature Settings (deep link `model_settings`).
          for (const link of [
            alertZero.featureSettingsLink,
            alertZero.noModelFeatureSettingsButton,
          ]) {
            await expect(link).toHaveAttribute('href', /\/management\/.+model_settings/);
          }
        } finally {
          await space.cleanup();
        }
      }
    );
  }
);
