/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../fixtures';

test.describe('UX URL Query', { tag: tags.stateful.classic }, () => {
  test('confirms query params are applied', async ({ pageObjects, page, browserAuth }) => {
    await test.step('Navigate to UX Dashboard', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.uxDashboard.goto();
      await pageObjects.uxDashboard.waitForLoadingToFinish();
    });

    await test.step('Confirm percentile query param', async () => {
      const percentileSelect = page.testSubj.locator('uxPercentileSelect');
      await expect(percentileSelect).toHaveValue(testData.DEFAULT_QUERY_PARAMS.percentile);
    });
  });
});
