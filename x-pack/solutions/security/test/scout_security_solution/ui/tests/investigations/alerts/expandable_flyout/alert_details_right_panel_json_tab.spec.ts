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
  'Alert details expandable flyout right panel json tab',
  { tag: tags.deploymentAgnostic },
  () => {
    test.beforeEach(async ({ browserAuth, page, apiServices }) => {
      await deleteAlertsAndRules(apiServices);
      await createRule(apiServices, getNewRule());
      await browserAuth.loginAsAdmin();
      await page.goto(ALERTS_URL);
      await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });
      await page.testSubj.locator('expand-event').click();
      await page.testSubj.locator('securitySolutionFlyoutJsonTab').click();
    });

    test.afterAll(async ({ apiServices }) => {
      await deleteAlertsAndRules(apiServices);
    });

    test('should display the json component', async ({ page }) => {
      await expect(
        page.testSubj.locator('securitySolutionFlyoutJsonTabCopyToClipboard')
      ).toHaveText('Copy to clipboard');

      const jsonContent = page.testSubj.locator('securitySolutionFlyoutjsonView');
      await expect(jsonContent).toContainText('_index');
      await expect(jsonContent).toContainText('_id');
    });
  }
);
