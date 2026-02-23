/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules, createRule } from '../../../../common/api_helpers';
import { getNewRule } from '../../../../common/rule_objects';
import { ALERTS_URL } from '../../../../common/urls';

test.describe('Expandable flyout state sync', { tag: tags.deploymentAgnostic }, () => {
  const rule = getNewRule();

  test.beforeEach(async ({ browserAuth, page, apiServices }) => {
    await deleteAlertsAndRules(apiServices);
    await createRule(apiServices, rule);
    await browserAuth.loginAsAdmin();
    await page.goto(ALERTS_URL);
    await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });
  });

  test.afterAll(async ({ apiServices }) => {
    await deleteAlertsAndRules(apiServices);
  });

  test('should test flyout url sync', async ({ page }) => {
    await test.step('URL should not include flyout param before opening', async () => {
      await expect(page).not.toHaveURL(/right/);
    });

    await test.step('Open flyout and verify URL serialization', async () => {
      await page.testSubj.locator('expand-event').click();
      await expect(page).toHaveURL(/right/);
      await expect(page.testSubj.locator('securitySolutionFlyoutAlertTitleText')).toHaveText(
        rule.name
      );
    });

    await test.step('Reopen flyout after browser refresh', async () => {
      await page.reload();
      await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });

      await expect(page).toHaveURL(/right/);
      await expect(page.testSubj.locator('securitySolutionFlyoutAlertTitleText')).toHaveText(
        rule.name
      );
    });

    await test.step('Clear URL state when flyout is closed', async () => {
      await page.testSubj.locator('euiFlyoutCloseButton').click();
      await expect(page).not.toHaveURL(/right/);
    });
  });
});
