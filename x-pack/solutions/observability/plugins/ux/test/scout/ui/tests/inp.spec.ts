/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('INP', { tag: tags.stateful.classic }, () => {
  test('displays Interaction to Next Paint values', async ({ pageObjects, page, browserAuth }) => {
    await test.step('Navigate to UX Dashboard', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.uxDashboard.goto({
        percentile: '50',
        rangeFrom: 'now-1y',
        rangeTo: 'now',
      });
      await pageObjects.uxDashboard.waitForLoadingToFinish();
    });

    await test.step('Check INP Values', async () => {
      await expect(page.getByText('Interaction to next paint')).toBeVisible();

      const inpVital = page.testSubj.locator('inp-core-vital');
      await expect(inpVital).toContainText('381 ms');
    });
  });
});
