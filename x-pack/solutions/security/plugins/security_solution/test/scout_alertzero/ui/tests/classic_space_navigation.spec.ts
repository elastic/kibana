/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { enableAlertZero, test } from '../fixtures';

test.describe('AlertZero in a Classic space', { tag: tags.stateful.classic }, () => {
  let restoreAlertZero: (() => Promise<void>) | undefined;

  test.beforeAll(async ({ apiServices, kbnClient }) => {
    restoreAlertZero = await enableAlertZero({ apiServices, kbnClient, solution: 'classic' });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async () => {
    await restoreAlertZero?.();
  });

  test('opens AlertZero from the Security side navigation', async ({ page }) => {
    const alertZeroNavLink = page.testSubj.locator(
      'solutionSideNavItemLink-external_link-alertzero'
    );

    await test.step('show AlertZero in the Security side navigation', async () => {
      await page.gotoApp('security/alerts', {
        readyWhen: page.testSubj.locator('solutionSideNavItemLink-external_link-discover'),
      });
      await expect(alertZeroNavLink).toBeVisible();
    });

    await test.step('open the AlertZero app from the link', async () => {
      await alertZeroNavLink.click();
      await expect(page.testSubj.locator('alertZeroAppChromeLayout')).toBeVisible();
    });
  });
});
