/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { RULES_MANAGEMENT_URL } from '../../../common/urls';

test.describe(
  'Value lists permissions',
  {
    tag: [...tags.stateful.classic],
  },
  () => {
    test('restricts t1 analyst from uploading value lists', async ({ page, browserAuth }) => {
      await test.step('Login as viewer/restricted user', async () => {
        await browserAuth.loginAsViewer();
      });

      await test.step('Navigate to rules management page', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
      });

      await test.step('Verify value lists button is disabled', async () => {
        const valueListsBtn = page.testSubj.locator('value-lists-modal-activator');
        const isVisible = await valueListsBtn.isVisible().catch(() => false);
        test.skip(!isVisible, 'Value lists button not visible');
        await expect(valueListsBtn).toBeDisabled();
      });
    });
  }
);
