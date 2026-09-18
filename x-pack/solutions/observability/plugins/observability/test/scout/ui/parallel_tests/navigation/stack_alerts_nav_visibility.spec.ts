/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest as test, tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';

test.describe(
  'Stack Alerts and Stack Rules visibility in Observability project nav',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ config, scoutSpace }) => {
      if (!config.serverless) {
        await scoutSpace.setSolutionView('oblt');
      }
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();
      await pageObjects.observabilityNavigation.waitForLoad();
    });

    test('hides Stack Alerts and Stack Rules under Alerts and Insights', async ({
      config,
      pageObjects,
    }) => {
      const nav = pageObjects.observabilityNavigation;
      const panelId = config.serverless ? 'admin_and_settings' : 'stack_management';
      const opener = nav.navItemInFooterById(panelId);

      await expect(opener).toBeVisible();
      await opener.click();

      const panel = nav.sidePanel(panelId);
      await expect(panel).toBeVisible();

      // Connectors stays as the control that the panel finished resolving deep links.
      await expect(
        panel.locator('[data-test-subj~="nav-item-id-management:triggersActionsConnectors"]')
      ).toBeVisible();
      await expect(
        panel.locator('[data-test-subj~="nav-item-id-management:triggersActions"]')
      ).toHaveCount(0);
      await expect(
        panel.locator('[data-test-subj~="nav-item-id-management:triggersActionsAlerts"]')
      ).toHaveCount(0);
    });
  }
);
