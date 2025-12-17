/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../fixtures';

test.describe('Homepage', { tag: ['@ess', '@svlSearch'] }, () => {
  test('Viewer should not be able to see manage button', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.homepage.goto();

    const headerLeftGroup = await pageObjects.homepage.getHeaderLeftGroup();

    await expect(headerLeftGroup).toContainText('Welcome, test viewer');
    await expect(headerLeftGroup).not.toContainText('Manage');
  });

  test('Admin should see the manage button', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.homepage.goto();

    const headerLeftGroup = await pageObjects.homepage.getHeaderLeftGroup();

    await expect(headerLeftGroup).toContainText('Welcome, test admin');
    const manageLink = await pageObjects.homepage.getManageLink();
    await expect(manageLink).toBeEnabled();
  });
});
