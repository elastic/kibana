/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams, resetRulesTableState } from '../../../common/rule_api_helpers';
import { getCustomQueryRuleParams } from '../../../common/rule_objects';

test.describe('Rules table: auto-refresh', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth, apiServices, kbnClient, page }) => {
    await browserAuth.loginAsAdmin();
    await resetRulesTableState(page);
    await deleteAlertsAndRules(apiServices);
    await createRuleFromParams(
      kbnClient,
      getCustomQueryRuleParams({ name: 'Auto refresh rule', rule_id: 'auto-1', enabled: false })
    );
  });

  test('auto-refresh gets deactivated when rules are selected', async ({ pageObjects }) => {
    await pageObjects.rulesManagementTable.goto();
    await pageObjects.rulesManagementTable.waitForTableToLoad();

    const autoRefreshBtn = pageObjects.rulesManagementTable.autoRefreshPopoverTrigger;
    await expect(autoRefreshBtn).toBeVisible();

    await pageObjects.rulesManagementTable.selectAllRules();
    await autoRefreshBtn.click();
    const switchEl = pageObjects.rulesManagementTable.refreshSettingsSwitch;
    const isChecked = await switchEl.getAttribute('aria-checked');
    expect(isChecked).toBe('false');
  });

  test('can disable auto-refresh via settings', async ({ pageObjects }) => {
    await pageObjects.rulesManagementTable.goto();
    await pageObjects.rulesManagementTable.waitForTableToLoad();
    await pageObjects.rulesManagementTable.disableAutoRefresh();

    await pageObjects.rulesManagementTable.autoRefreshPopoverTrigger.click();
    const switchEl = pageObjects.rulesManagementTable.refreshSettingsSwitch;
    await expect(switchEl).toHaveAttribute('aria-checked', 'false');
  });
});
