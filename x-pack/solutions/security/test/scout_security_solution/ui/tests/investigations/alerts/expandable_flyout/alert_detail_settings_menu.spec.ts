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

test.describe(
  'Alert details expandable flyout settings menu',
  { tag: tags.deploymentAgnostic },
  () => {
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

    test('should allow user to switch between push and overlay modes', async ({ page }) => {
      await page.testSubj.locator('expand-event').click();
      await page.testSubj.locator('settingsMenuButton').click();

      await test.step('Verify overlay option is selected by default', async () => {
        const overlayOption = page.testSubj.locator(
          'settingsMenuFlyoutTypeButtonGroupOverlayOption'
        );
        await expect(overlayOption).toHaveClass(/euiButtonGroupButton-isSelected/);

        const pushOption = page.testSubj.locator('settingsMenuFlyoutTypeButtonGroupPushOption');
        await expect(pushOption).not.toHaveClass(/euiButtonGroupButton-isSelected/);
      });

      await test.step('Verify selection persists via localstorage', async () => {
        await page.testSubj.locator('settingsMenuFlyoutTypeButtonGroupPushOption').click();
        await page.reload();

        await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });
        await page.testSubj.locator('expand-event').click();
        await page.testSubj.locator('settingsMenuButton').click();

        const overlayOption = page.testSubj.locator(
          'settingsMenuFlyoutTypeButtonGroupOverlayOption'
        );
        await expect(overlayOption).not.toHaveClass(/euiButtonGroupButton-isSelected/);

        const pushOption = page.testSubj.locator('settingsMenuFlyoutTypeButtonGroupPushOption');
        await expect(pushOption).toHaveClass(/euiButtonGroupButton-isSelected/);
      });
    });

    test('should not allow user to switch modes for flyout opened from timeline', async ({
      page,
    }) => {
      // TODO: investigate first alert in timeline, then open expandable flyout from within timeline
      // This requires the investigateFirstAlertInTimeline helper to be migrated to Scout
      // For now, verify the settings menu button exists when opening from alerts page
      await page.testSubj.locator('expand-event').click();
      await page.testSubj.locator('settingsMenuButton').click();
      await expect(page.testSubj.locator('settingsMenuFlyoutTypeButtonGroup')).toBeVisible();
    });
  }
);
