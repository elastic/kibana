/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getNewRule } from '../../../common/rule_objects';

test.describe(
  'Alerts table bulk actions',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await createRuleFromParams(kbnClient, getNewRule());
    });

    test('shows the and cases bulk actions', async ({ pageObjects, page }) => {
      await pageObjects.detectionAlerts.goto();
      await pageObjects.detectionAlerts.waitForAlertsToLoad();
      await page.waitForTimeout(15_000); // Wait for alerts to populate (auditbeat data)
      const rows = await pageObjects.detectionAlerts.getDataGridRows().count();
      test.skip(rows < 2, 'Insufficient alert data - needs auditbeat_multiple esArchiver');
      await pageObjects.detectionAlerts.selectNumberOfAlerts(2);
      await expect(pageObjects.detectionAlerts.selectedAlertsButton.first()).toHaveText(
        'Selected 2 alerts'
      );
      await pageObjects.detectionAlerts.clickTakeActionPopover();
      await expect(pageObjects.detectionAlerts.takeActionPopoverBtn.first()).toBeVisible();
      await expect(pageObjects.detectionAlerts.addToNewCaseButton.first()).toBeVisible();
      await expect(pageObjects.detectionAlerts.addToExistingCaseButton.first()).toBeVisible();
    });
  }
);
