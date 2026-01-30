/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';

test.describe('Infrastructure Inventory', { tag: ['@ess', '@svlOblt'] }, () => {
  test('Page should load', async ({ pageObjects: { inventoryPage }, browserAuth, page }) => {
    await browserAuth.loginAsViewer();
    await inventoryPage.goto();

    await expect(page.getByTestId('breadcrumb last')).toHaveText('Infrastructure inventory');
  });
});
