/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';

test.describe('Infrastructure Inventory - Alerts Flyout', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects: { inventoryPage } }) => {
    await browserAuth.loginAsPrivilegedUser();
    await inventoryPage.addDismissK8sTourInitScript();
    await inventoryPage.goToPage();
  });

  test(
    'Should open inventory rule flyout',
    { tag: tags.serverless.observability.complete },
    async ({ pageObjects: { inventoryPage } }) => {
      await test.step('open alerts menu', async () => {
        await inventoryPage.alertsHeaderButton.click();
        await expect(inventoryPage.alertsMenu).toBeVisible();
      });

      await test.step('open infrastructure rules submenu', async () => {
        await inventoryPage.inventoryAlertsMenuOption.click();
        await expect(inventoryPage.alertsMenu).toContainText('Infrastructure rules');
      });

      await test.step('open inventory rule flyout', async () => {
        await inventoryPage.createInventoryRuleButton.click();
        await expect(inventoryPage.alertsFlyout).toBeVisible();
        await expect(inventoryPage.alertsFlyoutRuleDefinitionSection).toBeVisible();
        await expect(inventoryPage.alertsFlyoutRuleTypeName).toHaveText('Inventory');
      });
    }
  );

  test('Should open metrics threshold rule flyout', async ({ pageObjects: { inventoryPage } }) => {
    await test.step('open alerts menu', async () => {
      await inventoryPage.alertsHeaderButton.click();
      await expect(inventoryPage.alertsMenu).toBeVisible();
    });

    await test.step('open metrics rules submenu', async () => {
      await inventoryPage.metricsAlertsMenuOption.click();
      await expect(inventoryPage.alertsMenu).toContainText('Metrics rules');
    });

    await test.step('open metrics threshold rule flyout', async () => {
      await inventoryPage.createMetricsThresholdRuleButton.click();
      await expect(inventoryPage.alertsFlyout).toBeVisible();
      await expect(inventoryPage.alertsFlyoutRuleDefinitionSection).toBeVisible();
      await expect(inventoryPage.alertsFlyoutRuleTypeName).toHaveText('Metric threshold');
    });
  });

  test(
    'Should not have option to create custom threshold rule',
    { tag: tags.serverless.observability.complete },
    async ({ pageObjects: { inventoryPage } }) => {
      await test.step('open alerts menu', async () => {
        await inventoryPage.alertsHeaderButton.click();
        await expect(inventoryPage.alertsMenu).toBeVisible();
      });

      await test.step('verify custom threshold alert menu option is not visible', async () => {
        await expect(inventoryPage.customThresholdAlertMenuOption).toBeHidden();
      });
    }
  );
});
