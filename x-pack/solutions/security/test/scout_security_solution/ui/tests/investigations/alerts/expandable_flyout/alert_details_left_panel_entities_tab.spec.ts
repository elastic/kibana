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
  'Alert details expandable flyout left panel entities',
  { tag: tags.deploymentAgnostic },
  () => {
    test.beforeEach(async ({ browserAuth, page, apiServices }) => {
      await deleteAlertsAndRules(apiServices);
      await createRule(apiServices, getNewRule());
      await browserAuth.loginAsAdmin();
      await page.goto(ALERTS_URL);
      await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });
      await page.testSubj.locator('expand-event').click();
      await page.testSubj.locator('securitySolutionFlyoutNavigationExpandDetailButton').click();
      await page.testSubj.locator('securitySolutionFlyoutInsightsTab').click();
      await page.testSubj.locator('securitySolutionFlyoutInsightsTabEntitiesButton').click();
    });

    test.afterAll(async ({ apiServices }) => {
      await deleteAlertsAndRules(apiServices);
    });

    test('should display host details and user details under Insights Entities', async ({
      page,
    }) => {
      const insightsTab = page.testSubj.locator('securitySolutionFlyoutInsightsTab');
      await expect(insightsTab).toHaveText('Insights');
      await expect(insightsTab).toHaveClass(/euiTab-isSelected/);

      const entitiesButton = page.testSubj.locator(
        'securitySolutionFlyoutInsightsTabEntitiesButton'
      );
      await expect(entitiesButton).toHaveText('Entities');
      await expect(entitiesButton).toHaveClass(/euiButtonGroupButton-isSelected/);

      await expect(
        page.testSubj.locator('securitySolutionFlyoutUsersDetailsRightSection')
      ).toContainText('Related hosts: 0');
      await expect(page.testSubj.locator('securitySolutionFlyoutUsersDetails')).toBeVisible();

      await expect(
        page.testSubj.locator('securitySolutionFlyoutHostsDetailsRightSection')
      ).toContainText('Related users: 0');
      await expect(page.testSubj.locator('securitySolutionFlyoutHostsDetails')).toBeVisible();
    });

    test('should open host preview when click on host details title', async ({ page }) => {
      const hostDetailsLink = page.testSubj.locator(
        'securitySolutionFlyoutInsightsTabHostDetailsLink'
      );
      await expect(hostDetailsLink).toContainText('siem-kibana');
      await hostDetailsLink.click();

      await expect(page.testSubj.locator('previewSection')).toBeVisible();
      await expect(page.testSubj.locator('previewSectionBannerText')).toHaveText(
        'Preview host details'
      );
      await expect(page.testSubj.locator('host-panel-header')).toBeVisible();
      await expect(page.testSubj.locator('host-preview-footer')).toBeVisible();

      await test.step('Open host flyout from footer link', async () => {
        await page.testSubj.locator('open-host-flyout-link').click();
        await expect(page.testSubj.locator('host-panel-header')).toBeVisible();
        await expect(page.testSubj.locator('previewSection')).toBeHidden();
      });
    });

    test('should open user preview when click on user details title', async ({ page }) => {
      const userDetailsLink = page.testSubj.locator(
        'securitySolutionFlyoutInsightsTabUserDetailsLink'
      );
      await expect(userDetailsLink).toContainText('test');
      await userDetailsLink.click();

      await expect(page.testSubj.locator('previewSection')).toBeVisible();
      await expect(page.testSubj.locator('previewSectionBannerText')).toHaveText(
        'Preview user details'
      );
      await expect(page.testSubj.locator('user-panel-header')).toBeVisible();
      await expect(page.testSubj.locator('user-preview-footer')).toBeVisible();

      await test.step('Open user flyout from footer link', async () => {
        await page.testSubj.locator('open-user-flyout-link').click();
        await expect(page.testSubj.locator('user-panel-header')).toBeVisible();
        await expect(page.testSubj.locator('previewSection')).toBeHidden();
      });
    });
  }
);
