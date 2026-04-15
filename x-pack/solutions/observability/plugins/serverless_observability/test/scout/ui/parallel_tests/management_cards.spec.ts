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
  'Serverless Observability Management Cards',
  { tag: [...tags.serverless.observability.all] },
  () => {
    test('management landing page shows card navigation and Admin panel', async ({
      page,
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.serverlessNav.goto();

      await test.step('navigate to management and verify cards page rendered', async () => {
        await page.gotoApp('management');
        await expect(
          pageObjects.serverlessNav.getPageLocator('cards-navigation-page')
        ).toBeVisible();
      });

      await test.step('Admin and Settings panel is visible in sidenav', async () => {
        await expect(pageObjects.collapsibleNav.getNavItemById('admin_and_settings')).toBeVisible();
      });
    });
  }
);
