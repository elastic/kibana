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
  'Alert details expandable flyout rule preview panel',
  { tag: tags.deploymentAgnostic },
  () => {
    const rule = getNewRule();

    test.beforeEach(async ({ browserAuth, page, apiServices }) => {
      await deleteAlertsAndRules(apiServices);
      await createRule(apiServices, rule);
      await browserAuth.loginAsAdmin();
      await page.goto(ALERTS_URL);
      await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });
      await page.testSubj.locator('expand-event').click();
      await page.testSubj.locator('securitySolutionFlyoutRuleSummaryButton').click();
    });

    test.afterAll(async ({ apiServices }) => {
      await deleteAlertsAndRules(apiServices);
    });

    test('should display rule preview and its sub sections', async ({ page }) => {
      await test.step('Verify title', async () => {
        await expect(page.testSubj.locator('securitySolutionFlyoutRulePanelTitle')).toContainText(
          rule.name
        );
        await expect(
          page.testSubj.locator('securitySolutionFlyoutRulePanelCreatedByText')
        ).toBeVisible();
        await expect(
          page.testSubj.locator('securitySolutionFlyoutRulePanelUpdatedByText')
        ).toBeVisible();
      });

      await test.step('Verify about section', async () => {
        await expect(
          page.testSubj.locator('securitySolutionFlyoutRulePanelAboutSectionHeader')
        ).toContainText('About');

        const aboutContent = page.testSubj.locator(
          'securitySolutionFlyoutRulePanelAboutSectionContent'
        );
        await expect(aboutContent).toContainText('Severity');
        await expect(aboutContent).toContainText('High');
        await expect(aboutContent).toContainText('Risk score');
        await expect(aboutContent).toContainText('17');
      });

      await test.step('Collapse about and verify definition section', async () => {
        await page.testSubj.locator('securitySolutionFlyoutRulePanelAboutSectionHeader').click();
        await page.testSubj
          .locator('securitySolutionFlyoutRulePanelDefinitionSectionHeader')
          .click();

        await expect(
          page.testSubj.locator('securitySolutionFlyoutRulePanelDefinitionSectionHeader')
        ).toContainText('Definition');

        const definitionContent = page.testSubj.locator(
          'securitySolutionFlyoutRulePanelDefinitionSectionContent'
        );
        await expect(definitionContent).toContainText('Index patterns');
        await expect(definitionContent).toContainText('Custom query');
        await expect(definitionContent).toContainText(rule.query!);
        await expect(definitionContent).toContainText('Rule type');

        await page.testSubj
          .locator('securitySolutionFlyoutRulePanelDefinitionSectionHeader')
          .click();
      });

      await test.step('Verify schedule section', async () => {
        await page.testSubj.locator('securitySolutionFlyoutRulePanelScheduleSectionHeader').click();

        await expect(
          page.testSubj.locator('securitySolutionFlyoutRulePanelScheduleSectionHeader')
        ).toContainText('Schedule');

        const scheduleContent = page.testSubj.locator(
          'securitySolutionFlyoutRulePanelScheduleSectionContent'
        );
        await expect(scheduleContent).toContainText('Runs every');
        await expect(scheduleContent).toContainText(rule.interval!);

        await page.testSubj.locator('securitySolutionFlyoutRulePanelScheduleSectionHeader').click();
      });

      await test.step('Verify footer', async () => {
        await expect(
          page.testSubj.locator('securitySolutionFlyoutRulePreviewPanelFooter')
        ).toBeVisible();
        await expect(
          page.testSubj.locator('securitySolutionFlyoutRulePreviewPanelFooterOpenRuleFlyout')
        ).toContainText('Show full rule details');
      });
    });
  }
);
