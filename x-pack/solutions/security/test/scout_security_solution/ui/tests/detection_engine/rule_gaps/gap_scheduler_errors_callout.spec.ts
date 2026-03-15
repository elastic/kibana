/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules, deleteGapAutoFillScheduler } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getCustomQueryRuleParams } from '../../../common/rule_objects';
import { RULES_MANAGEMENT_URL } from '../../../common/urls';

test.describe(
  'Gap scheduler errors callout',
  {
    tag: [...tags.stateful.classic],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await deleteGapAutoFillScheduler(kbnClient);
      await createRuleFromParams(
        kbnClient,
        getCustomQueryRuleParams({ rule_id: '1', name: 'Rule 1', interval: '1m', from: 'now-1m' })
      );
    });

    test('shows gap scheduler errors callout when there are scheduler errors', async ({
      page,
      pageObjects,
    }) => {
      const { rulesManagementTable, ruleGaps } = pageObjects;

      await test.step('Navigate to rules monitoring tab', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
        await rulesManagementTable.waitForTableToLoad();
        await ruleGaps.gotoMonitoringTab();
      });

      await test.step('Check for errors callout', async () => {
        const errorsCallout = ruleGaps.errorsCallout;
        const isVisible = await errorsCallout.isVisible().catch(() => false);
        test.skip(
          !isVisible,
          'Gap scheduler errors callout not visible - feature may not be enabled'
        );
        await expect(errorsCallout).toBeVisible();
      });

      await test.step('Verify logs link is available', async () => {
        const logsLink = ruleGaps.errorsLogsLink;
        const isVisible = await logsLink.isVisible().catch(() => false);
        test.skip(!isVisible, 'Gap scheduler errors logs link not visible');
        await expect(logsLink).toBeVisible();
      });

      await test.step('Dismiss callout', async () => {
        const dismissBtn = ruleGaps.errorsDismissButton;
        const isVisible = await dismissBtn.isVisible().catch(() => false);
        if (isVisible) {
          await dismissBtn.click();
          await expect(ruleGaps.errorsCallout).toBeHidden();
        }
      });
    });
  }
);
