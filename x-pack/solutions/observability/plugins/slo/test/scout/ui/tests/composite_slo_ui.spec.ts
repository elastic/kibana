/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe(
  'Composite SLO UI',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': { 'slo.compositeSloEnabled': true },
      });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.slo.goto();
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': { 'slo.compositeSloEnabled': false },
      });
    });

    test('renders SLOs and Composite SLOs tabs', async ({ page }) => {
      await expect(page.getByTestId('sloTab-slos')).toBeVisible();
      await expect(page.getByTestId('sloTab-compositeSlos')).toBeVisible();
    });

    test('shows Create composite SLO option in create dropdown', async ({ page }) => {
      await page.getByTestId('slosPageCreateSloDropdown').click();
      await expect(page.getByTestId('slosPageCreateCompositeSloButton')).toBeVisible();
    });

    test('renders composite SLO table when Composite SLOs tab is clicked', async ({ page }) => {
      await page.getByTestId('sloTab-compositeSlos').click();
      await expect(page.getByTestId('compositeSloList')).toBeVisible();
    });
  }
);
