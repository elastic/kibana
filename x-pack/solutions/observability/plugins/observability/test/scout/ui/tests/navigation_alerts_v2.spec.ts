/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This suite runs sequentially (in `tests/`, not `parallel_tests/`) because it
 * toggles `alerting:v2:enabled`, a server-wide global setting. Placing it in
 * `parallel_tests/` would leak the setting change into other workers.
 */

import { spaceTest as test, tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';

const ALERTING_V2_ENABLED_SETTING = 'alerting:v2:enabled';
const SHOW_CLASSIC_ALERTS_TABLE_SETTING = 'alerting:v2:showClassicAlertsTable';

test.describe(
  'Observability Alerts nav — alerting v2 feature flag',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.setSolutionView('oblt');
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.uiSettings.updateGlobal({ [ALERTING_V2_ENABLED_SETTING]: false });
      await kbnClient.uiSettings.update({ [SHOW_CLASSIC_ALERTS_TABLE_SETTING]: false });
    });

    test(
      'shows a plain Alerts link when alerting v2 is disabled',
      async ({ browserAuth, pageObjects }) => {
        await browserAuth.loginAsAdmin();
        await pageObjects.observabilityNavigation.goto();
        await pageObjects.observabilityNavigation.waitForLoad();

        const nav = pageObjects.observabilityNavigation;

        const alertsLink = nav.navItemInPrimaryByDeepLinkId('observability-overview:alerts');
        await expect(alertsLink).toBeVisible();
        await expect(alertsLink).toHaveAttribute('href', /\/app\/observability\/alerts/);

        const alertsPanel = nav.navItemInPrimaryById('alerting');
        await expect(alertsPanel).not.toBeVisible();
      }
    );

    test(
      'hides Alerts V1 link when showClassicAlertsTable is off',
      async ({ browserAuth, pageObjects, kbnClient }) => {
        await kbnClient.uiSettings.updateGlobal({ [ALERTING_V2_ENABLED_SETTING]: true });
        await kbnClient.uiSettings.update({ [SHOW_CLASSIC_ALERTS_TABLE_SETTING]: false });

        await browserAuth.loginAsAdmin();
        await pageObjects.observabilityNavigation.goto();
        await pageObjects.observabilityNavigation.waitForLoad();

        const nav = pageObjects.observabilityNavigation;

        await test.step('Alerts panel opener is visible', async () => {
          await expect(nav.navItemInPrimaryById('alerting')).toBeVisible();
        });

        await test.step('panel contains Inbox but not Alerts V1', async () => {
          await nav.navItemInPrimaryById('alerting').click();
          const panel = nav.sidePanel('alerting');
          await expect(panel).toBeVisible();

          await expect(
            panel.locator('[data-test-subj~="nav-item-deepLinkId-management:episodes"]')
          ).toBeVisible();
          await expect(
            panel.locator(
              '[data-test-subj~="nav-item-deepLinkId-observability-overview:alerts"]'
            )
          ).not.toBeVisible();
        });
      }
    );

    test(
      'shows Alerts V1 link when showClassicAlertsTable is on',
      async ({ browserAuth, pageObjects, kbnClient }) => {
        await kbnClient.uiSettings.updateGlobal({ [ALERTING_V2_ENABLED_SETTING]: true });
        await kbnClient.uiSettings.update({ [SHOW_CLASSIC_ALERTS_TABLE_SETTING]: true });

        await browserAuth.loginAsAdmin();
        await pageObjects.observabilityNavigation.goto();
        await pageObjects.observabilityNavigation.waitForLoad();

        const nav = pageObjects.observabilityNavigation;

        await test.step('panel contains both Inbox and Alerts V1', async () => {
          await nav.navItemInPrimaryById('alerting').click();
          const panel = nav.sidePanel('alerting');
          await expect(panel).toBeVisible();

          await expect(
            panel.locator('[data-test-subj~="nav-item-deepLinkId-management:episodes"]')
          ).toBeVisible();
          await expect(
            panel.locator(
              '[data-test-subj~="nav-item-deepLinkId-observability-overview:alerts"]'
            )
          ).toBeVisible();
        });

        await test.step('panel contains Rule Management section', async () => {
          const panel = nav.sidePanel('alerting');
          await expect(
            panel.locator('[data-test-subj~="nav-item-deepLinkId-management:rules"]')
          ).toBeVisible();
          await expect(
            panel.locator('[data-test-subj~="nav-item-deepLinkId-management:rule_library"]')
          ).toBeVisible();
        });

        await test.step('panel contains Notifications and Suppressions section', async () => {
          const panel = nav.sidePanel('alerting');
          await expect(
            panel.locator('[data-test-subj~="nav-item-deepLinkId-management:action_policies"]')
          ).toBeVisible();
          await expect(
            panel.locator('[data-test-subj~="nav-item-deepLinkId-management:maintenanceWindows"]')
          ).toBeVisible();
        });

        await test.step('panel contains Operations section', async () => {
          const panel = nav.sidePanel('alerting');
          await expect(
            panel.locator('[data-test-subj~="nav-item-deepLinkId-management:execution_history"]')
          ).toBeVisible();
        });
      }
    );

    test(
      'reverts to plain Alerts link after disabling alerting v2',
      async ({ browserAuth, pageObjects, kbnClient }) => {
        await kbnClient.uiSettings.updateGlobal({ [ALERTING_V2_ENABLED_SETTING]: false });
        await kbnClient.uiSettings.update({ [SHOW_CLASSIC_ALERTS_TABLE_SETTING]: false });

        await browserAuth.loginAsAdmin();
        await pageObjects.observabilityNavigation.goto();
        await pageObjects.observabilityNavigation.waitForLoad();

        const nav = pageObjects.observabilityNavigation;

        const alertsLink = nav.navItemInPrimaryByDeepLinkId('observability-overview:alerts');
        await expect(alertsLink).toBeVisible();

        const alertsPanel = nav.navItemInPrimaryById('alerting');
        await expect(alertsPanel).not.toBeVisible();
      }
    );
  }
);

test.describe(
  'Observability Alerts nav — classic sidebar',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.setSolutionView('classic');
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.uiSettings.updateGlobal({ [ALERTING_V2_ENABLED_SETTING]: false });
      await kbnClient.uiSettings.update({ [SHOW_CLASSIC_ALERTS_TABLE_SETTING]: false });
    });

    test(
      'shows Alerts as a sub-nav link under Observability with no feature flags',
      async ({ browserAuth, pageObjects, page }) => {
        await browserAuth.loginAsAdmin();
        await page.gotoApp('observability/alerts');

        const alertsLink = page.locator(
          '[data-test-subj~="nav-item-deepLinkId-observability-overview:alerts"]'
        );
        await expect(alertsLink).toBeVisible();
        await expect(alertsLink).toHaveAttribute('href', /\/app\/observability\/alerts/);

        const activeAlertsLink = page.locator(
          '[data-test-subj~="nav-item-deepLinkId-observability-overview:alerts"][data-test-subj~="nav-item-isActive"]'
        );
        await expect(activeAlertsLink).toBeVisible();
      }
    );

    test(
      'Alerts link is unchanged when alerting v2 is enabled',
      async ({ browserAuth, pageObjects, page, kbnClient }) => {
        await kbnClient.uiSettings.updateGlobal({ [ALERTING_V2_ENABLED_SETTING]: true });

        await browserAuth.loginAsAdmin();
        await page.gotoApp('observability/alerts');

        const alertsLink = page.locator(
          '[data-test-subj~="nav-item-deepLinkId-observability-overview:alerts"]'
        );
        await expect(alertsLink).toBeVisible();
        await expect(alertsLink).toHaveAttribute('href', /\/app\/observability\/alerts/);

        const activeAlertsLink = page.locator(
          '[data-test-subj~="nav-item-deepLinkId-observability-overview:alerts"][data-test-subj~="nav-item-isActive"]'
        );
        await expect(activeAlertsLink).toBeVisible();

        const alertsPanel = page.locator(
          '[data-test-subj~="nav-item-id-alerting"][data-test-subj~="nav-item-renderAs-panelOpener"]'
        );
        await expect(alertsPanel).not.toBeVisible();
      }
    );

    test(
      'Alerts link is unchanged when both flags are enabled',
      async ({ browserAuth, pageObjects, page, kbnClient }) => {
        await kbnClient.uiSettings.updateGlobal({ [ALERTING_V2_ENABLED_SETTING]: true });
        await kbnClient.uiSettings.update({ [SHOW_CLASSIC_ALERTS_TABLE_SETTING]: true });

        await browserAuth.loginAsAdmin();
        await page.gotoApp('observability/alerts');

        const alertsLink = page.locator(
          '[data-test-subj~="nav-item-deepLinkId-observability-overview:alerts"]'
        );
        await expect(alertsLink).toBeVisible();
        await expect(alertsLink).toHaveAttribute('href', /\/app\/observability\/alerts/);

        const activeAlertsLink = page.locator(
          '[data-test-subj~="nav-item-deepLinkId-observability-overview:alerts"][data-test-subj~="nav-item-isActive"]'
        );
        await expect(activeAlertsLink).toBeVisible();

        const alertsPanel = page.locator(
          '[data-test-subj~="nav-item-id-alerting"][data-test-subj~="nav-item-renderAs-panelOpener"]'
        );
        await expect(alertsPanel).not.toBeVisible();
      }
    );
  }
);
