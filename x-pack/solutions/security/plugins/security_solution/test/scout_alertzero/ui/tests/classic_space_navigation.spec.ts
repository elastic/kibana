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
    const alertZeroNavLink = page.testSubj.locator('solutionSideNavItemLink-alertzero:home');
    const escalationsNavLink = page.testSubj.locator(
      'solutionSideNavItemLink-alertzero:escalations'
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

    await test.step('keep the Security side navigation on AlertZero pages', async () => {
      await expect(escalationsNavLink).toBeVisible();
      await expect(
        page.testSubj.locator('solutionSideNavItemLink-alertzero:watches')
      ).toBeVisible();
      await escalationsNavLink.click();
      await expect(page).toHaveURL(/\/app\/alertzero\/escalations/);
      await expect(escalationsNavLink).toBeVisible();
    });

    await test.step('open a Security page from an AlertZero page', async () => {
      await page.testSubj.locator('solutionSideNavItemLink-cases').click();
      await expect(page).toHaveURL(/\/app\/security\/cases/);
      await expect(alertZeroNavLink).toBeVisible();
    });
  });
});
