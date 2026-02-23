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
  'Alert details expandable flyout right panel',
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

    test('should display header and footer basics', async ({ page }) => {
      await page.testSubj.locator('expand-event').click();

      await test.step('Verify header elements', async () => {
        await expect(page.testSubj.locator('securitySolutionFlyoutAlertTitleIcon')).toBeVisible();
        await expect(page.testSubj.locator('securitySolutionFlyoutAlertTitleText')).toHaveText(
          rule.name
        );
        await expect(
          page.testSubj.locator('securitySolutionFlyoutAlertTitleLinkIcon')
        ).toBeVisible();
        await expect(page.testSubj.locator('rule-status-badge')).toHaveText('open');

        await expect(
          page.testSubj.locator('securitySolutionFlyoutHeaderRiskScoreTitle')
        ).toHaveText('Risk score');
        await expect(
          page.testSubj.locator('securitySolutionFlyoutHeaderRiskScoreValue')
        ).toHaveText(String(rule.risk_score));

        await expect(
          page.testSubj.locator('securitySolutionFlyoutHeaderAssigneesTitle')
        ).toHaveText('Assignees');

        await expect(page.testSubj.locator('securitySolutionFlyoutHeaderNotesTitle')).toHaveText(
          'Notes'
        );
        await expect(
          page.testSubj.locator('securitySolutionFlyoutHeaderNotesAddNoteButton')
        ).toBeVisible();

        await expect(page.testSubj.locator('severity')).toHaveText('High');
      });

      await test.step('Verify all 3 tabs are visible', async () => {
        const overviewTab = page.testSubj.locator('securitySolutionFlyoutOverviewTab');
        await expect(overviewTab).toHaveText('Overview');
        await expect(overviewTab).toHaveClass(/euiTab-isSelected/);

        const tableTab = page.testSubj.locator('securitySolutionFlyoutTableTab');
        await expect(tableTab).toHaveText('Table');
        await expect(tableTab).not.toHaveClass(/euiTab-isSelected/);

        const jsonTab = page.testSubj.locator('securitySolutionFlyoutJsonTab');
        await expect(jsonTab).toHaveText('JSON');
        await expect(jsonTab).not.toHaveClass(/euiTab-isSelected/);
      });

      await test.step('Verify expand/collapse button', async () => {
        await page.testSubj.locator('securitySolutionFlyoutNavigationExpandDetailButton').click();
        await expect(
          page.testSubj.locator('securitySolutionFlyoutNavigationCollapseDetailButton')
        ).toHaveText('Collapse details');

        await page.testSubj.locator('securitySolutionFlyoutNavigationCollapseDetailButton').click();
        await expect(
          page.testSubj.locator('securitySolutionFlyoutNavigationExpandDetailButton')
        ).toHaveText('Expand details');
      });

      await test.step('Verify take action button is visible on all tabs', async () => {
        await expect(page.testSubj.locator('securitySolutionFlyoutFooter')).toBeVisible();
        await expect(
          page.testSubj.locator('securitySolutionFlyoutFooterDropdownButton')
        ).toBeVisible();

        await page.testSubj.locator('securitySolutionFlyoutTableTab').click();
        await expect(page.testSubj.locator('securitySolutionFlyoutTableTab')).toHaveClass(
          /euiTab-isSelected/
        );
        await expect(page.testSubj.locator('securitySolutionFlyoutFooter')).toBeVisible();
        await expect(
          page.testSubj.locator('securitySolutionFlyoutFooterDropdownButton')
        ).toBeVisible();

        await page.testSubj.locator('securitySolutionFlyoutJsonTab').click();
        await expect(page.testSubj.locator('securitySolutionFlyoutJsonTab')).toHaveClass(
          /euiTab-isSelected/
        );
        await expect(page.testSubj.locator('securitySolutionFlyoutFooter')).toBeVisible();
        await expect(
          page.testSubj.locator('securitySolutionFlyoutFooterDropdownButton')
        ).toBeVisible();
      });
    });

    test('should add to new case', async ({ page }) => {
      await page.testSubj.locator('expand-event').click();

      await page.testSubj.locator('securitySolutionFlyoutFooterDropdownButton').click();
      await page.testSubj.locator('add-to-new-case-action').click();

      const caseNameInput = page.testSubj.locator('input[aria-describedby="caseTitle"]');
      await caseNameInput.waitFor({ state: 'visible' });
      await page.getByTestId('create-case-submit').click();

      await expect(page.locator('.euiToast')).toContainText('View case');
    });

    test('should mark as acknowledged', async ({ page }) => {
      await page.testSubj.locator('expand-event').click();

      await page.testSubj.locator('securitySolutionFlyoutFooterDropdownButton').click();
      await page.testSubj.locator('acknowledged-alert-status').click();

      await expect(page.locator('.euiToast')).toContainText(
        'Successfully marked 1 alert as acknowledged.'
      );
    });

    test('should test take action dropdown items', async ({ page }) => {
      await page.testSubj.locator('expand-event').click();

      await test.step('Verify endpoint exception is disabled', async () => {
        await page.testSubj.locator('securitySolutionFlyoutFooterDropdownButton').click();
        await expect(page.testSubj.locator('add-endpoint-exception-menu-item')).toBeDisabled();
      });

      await test.step('Verify rule exception flyout opens', async () => {
        await page.testSubj.locator('add-exception-menu-item').click();
        await expect(page.testSubj.locator('exceptionFlyoutTitle')).toBeVisible();
        await page.testSubj.locator('cancelExceptionAddButton').click();
      });

      await test.step('Verify isolate host is disabled', async () => {
        await page.testSubj.locator('securitySolutionFlyoutFooterDropdownButton').click();
        await expect(page.testSubj.locator('isolate-host-action-item')).toBeDisabled();
      });

      await test.step('Verify respond is disabled', async () => {
        await page.testSubj.locator('securitySolutionFlyoutFooterDropdownButton').click();
        await expect(page.testSubj.locator('endpointResponseActions-action-item')).toBeDisabled();
      });

      await test.step('Verify investigate in timeline', async () => {
        await page.testSubj.locator('securitySolutionFlyoutFooterDropdownButton').click();
        await page.testSubj.locator('investigate-in-timeline-action-item').click();
        await expect(page.testSubj.locator('timelineHeader')).toBeVisible();
        await expect(page.testSubj.locator('providerContainer')).toBeVisible();
      });
    });
  }
);
