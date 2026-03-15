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
  'Alert details expandable flyout right panel table tab',
  { tag: tags.deploymentAgnostic },
  () => {
    test.beforeEach(async ({ browserAuth, page, apiServices }) => {
      await deleteAlertsAndRules(apiServices);
      await createRule(apiServices, getNewRule());
      await browserAuth.loginAsAdmin();
      await page.goto(ALERTS_URL);
      await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });
      await page.testSubj.locator('expand-event').click();
      await page.testSubj.locator('securitySolutionFlyoutTableTab').click();
    });

    test.afterAll(async ({ apiServices }) => {
      await deleteAlertsAndRules(apiServices);
    });

    test('should display and filter the table', async ({ page }) => {
      const timestampRow = page.testSubj.locator('flyout-table-row-@timestamp');
      await expect(timestampRow).toBeVisible();
      await expect(timestampRow).toContainText('@timestamp');

      const idRow = page.testSubj.locator('flyout-table-row-_id');
      await expect(idRow).toBeVisible();
      await expect(idRow).toContainText('_id');

      await test.step('Filter the table by timestamp', async () => {
        const filterInput = page.testSubj.locator('securitySolutionFlyoutDocumentTableSearchInput');
        await filterInput.fill('timestamp');

        await expect(timestampRow).toBeVisible();
        await expect(timestampRow).toContainText('@timestamp');
      });
    });

    test('should test cell actions', async ({ page }) => {
      await test.step('Cell actions filter in', async () => {
        const timestampCell = page.testSubj.locator('event-field-@timestamp');
        await timestampCell.hover();
        await page.testSubj
          .locator('actionItem-security-detailsFlyout-cellActions-filterIn')
          .click();
        await expect(page.locator('.euiBadge__text')).toContainText('@timestamp:');
      });

      // TODO: additional cell action tests (filter out, add to timeline, copy to clipboard, toggle column)
      // require complex interaction patterns that need further adaptation for Scout
    });
  }
);
