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
  'Alert details expandable flyout left panel prevalence',
  { tag: tags.deploymentAgnostic },
  () => {
    test.beforeEach(async ({ browserAuth, page, apiServices }) => {
      await deleteAlertsAndRules(apiServices);
      await createRule(apiServices, {
        ...getNewRule(),
        investigation_fields: { field_names: ['host.os.name'] },
      });
      await browserAuth.loginAsAdmin();
      await page.goto(ALERTS_URL);
      await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });
      await page.testSubj.locator('expand-event').click();
      await page.testSubj.locator('securitySolutionFlyoutNavigationExpandDetailButton').click();
      await page.testSubj.locator('securitySolutionFlyoutInsightsTab').click();
      await page.testSubj.locator('securitySolutionFlyoutInsightsTabPrevalenceButton').click();
    });

    test.afterAll(async ({ apiServices }) => {
      await deleteAlertsAndRules(apiServices);
    });

    test('should display prevalence tab', async ({ page }) => {
      const insightsTab = page.testSubj.locator('securitySolutionFlyoutInsightsTab');
      await expect(insightsTab).toHaveText('Insights');
      await expect(insightsTab).toHaveClass(/euiTab-isSelected/);

      const prevalenceButton = page.testSubj.locator(
        'securitySolutionFlyoutInsightsTabPrevalenceButton'
      );
      await expect(prevalenceButton).toHaveText('Prevalence');
      await expect(prevalenceButton).toHaveClass(/euiButtonGroupButton-isSelected/);

      await expect(
        page.testSubj.locator('securitySolutionFlyoutPrevalenceDetailsDatePicker')
      ).toContainText('Last 30 days');

      const typeCell = page.testSubj.locator(
        'securitySolutionFlyoutPrevalenceDetailsTableFieldCell'
      );
      await expect(typeCell).toContainText('host.os.name');
      await expect(typeCell).toContainText('host.name');
      await expect(typeCell).toContainText('user.name');

      const nameCell = page.testSubj.locator(
        'securitySolutionFlyoutPrevalenceDetailsTableValueCell'
      );
      await expect(nameCell).toContainText('Mac OS X');
      await expect(nameCell).toContainText('siem-kibana');
      await expect(nameCell).toContainText('test');

      await expect(
        page.testSubj.locator('securitySolutionFlyoutPrevalenceDetailsTableAlertCountCell')
      ).toContainText('1');

      await expect(
        page.testSubj.locator('securitySolutionFlyoutPrevalenceDetailsTableDocCountCell')
      ).toContainText('—');

      await expect(
        page.testSubj.locator('securitySolutionFlyoutPrevalenceDetailsTableHostPrevalenceCell')
      ).toContainText('100');

      await expect(
        page.testSubj.locator('securitySolutionFlyoutPrevalenceDetailsTableUserPrevalenceCell')
      ).toContainText('100');
    });

    test('should open host preview when click on host name', async ({ page }) => {
      const linkCells = page.testSubj.locator(
        'securitySolutionFlyoutPrevalenceDetailsTablePreviewLinkCell'
      );
      await linkCells.locator('a').first().click();

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

    test('should open user preview when click on user name', async ({ page }) => {
      const linkCells = page.testSubj.locator(
        'securitySolutionFlyoutPrevalenceDetailsTablePreviewLinkCell'
      );
      // The user link is at a different position in the table
      await linkCells.locator('a').nth(1).click();

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
