/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

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
      await test.step('open inventory rule flyout', async () => {
        await inventoryPage.openInventoryRuleFlyout();
        await expect(inventoryPage.alertsFlyoutRuleDefinitionSection).toBeVisible();
        await expect(inventoryPage.alertsFlyoutRuleTypeName).toHaveText('Inventory');
      });
    }
  );

  test(
    'Should show related dashboards on the inventory rule details step',
    { tag: tags.serverless.observability.complete },
    async ({ pageObjects: { inventoryPage } }) => {
      await test.step('open the inventory rule flyout', async () => {
        await inventoryPage.openInventoryRuleFlyout();
      });

      await test.step('open the Details step and show the related dashboards section', async () => {
        await inventoryPage.alertsFlyoutDetailsStep.click();
        // The dashboards selector fetches saved objects, so allow extra time under CI contention.
        await expect(inventoryPage.alertsFlyoutLinkedDashboards).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });
    }
  );

  test('Should open metrics threshold rule flyout', async ({ pageObjects: { inventoryPage } }) => {
    await test.step('open metrics threshold rule flyout', async () => {
      await inventoryPage.openMetricsThresholdRuleFlyout();
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
