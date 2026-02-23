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
  'Alert details expandable flyout alert reason preview panel',
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
      await page.testSubj.locator('securitySolutionFlyoutReasonPreviewButton').click();
    });

    test.afterAll(async ({ apiServices }) => {
      await deleteAlertsAndRules(apiServices);
    });

    test('should display alert reason preview', async ({ page }) => {
      const alertReasonContainer = page.testSubj.locator('securitySolutionFlyoutAlertReasonBody');
      await expect(alertReasonContainer).toContainText('Alert reason');
      await expect(alertReasonContainer).toContainText('process');
      await expect(alertReasonContainer).toContainText('zsh');
      await expect(alertReasonContainer).toContainText('80');
      await expect(alertReasonContainer).toContainText('test');
      await expect(alertReasonContainer).toContainText('siem-kibana');
      await expect(alertReasonContainer).toContainText('high');
      await expect(alertReasonContainer).toContainText(rule.name);
    });
  }
);
