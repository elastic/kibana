/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { spaceTest, DEFEND_WORKFLOWS_ROUTES } from '../../fixtures';

spaceTest.describe(
  'Defend Workflows - RBAC navigation',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest('admin can access all management pages', async ({ page, browserAuth }) => {
      await browserAuth.loginAsAdmin();

      for (const [, route] of Object.entries(DEFEND_WORKFLOWS_ROUTES)) {
        await page.goto(route);
        await page.waitForLoadingIndicatorHidden();
        await expect(page.testSubj.locator('noPrivilegesPage')).toBeHidden();
      }
    });

    spaceTest('viewer cannot access endpoint management pages', async ({ page, browserAuth }) => {
      await browserAuth.loginAsViewer();

      await page.goto(DEFEND_WORKFLOWS_ROUTES.endpoints);
      await page.waitForLoadingIndicatorHidden();

      await expect(page.testSubj.locator('noPrivilegesPage')).toBeVisible();
    });
  }
);
