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

import {
  ALERTING_V2_ENABLED_SETTING_ID,
  ALERTING_V2_SHOW_CLASSIC_ALERTS_TABLE_SETTING_ID,
} from '@kbn/alerting-v2-constants';
import { spaceTest as test, tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';

const ALERTS_PANEL_ID = 'alerting';
const ALERTS_DEEP_LINK = 'observability-overview:alerts';

test.describe(
  'Observability Alerts nav — alerting v2 feature flag',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ scoutSpace, kbnClient }) => {
      await scoutSpace.setSolutionView('oblt');
      await kbnClient.uiSettings.updateGlobal({ [ALERTING_V2_ENABLED_SETTING_ID]: false });
      await scoutSpace.uiSettings.set({
        [ALERTING_V2_SHOW_CLASSIC_ALERTS_TABLE_SETTING_ID]: false,
      });
    });

    test.afterAll(async ({ scoutSpace, kbnClient }) => {
      await kbnClient.uiSettings.updateGlobal({ [ALERTING_V2_ENABLED_SETTING_ID]: false });
      await scoutSpace.uiSettings.set({
        [ALERTING_V2_SHOW_CLASSIC_ALERTS_TABLE_SETTING_ID]: false,
      });
    });

    test('shows a plain Alerts link when alerting v2 is disabled', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();
      await pageObjects.observabilityNavigation.waitForLoad();

      const nav = pageObjects.observabilityNavigation;

      const alertsLink = nav.navItemInPrimaryByDeepLinkId(ALERTS_DEEP_LINK);
      await expect(alertsLink).toBeVisible();
      await expect(alertsLink).toHaveAttribute('href', /\/app\/observability\/alerts/);

      const alertsPanel = nav.navItemInPrimaryById(ALERTS_PANEL_ID);
      await expect(alertsPanel).not.toBeVisible();
    });

    test('hides Alerts V1 link when showClassicAlertsTable is off', async ({
      browserAuth,
      pageObjects,
      kbnClient,
      scoutSpace,
    }) => {
      await kbnClient.uiSettings.updateGlobal({ [ALERTING_V2_ENABLED_SETTING_ID]: true });
      await scoutSpace.uiSettings.set({
        [ALERTING_V2_SHOW_CLASSIC_ALERTS_TABLE_SETTING_ID]: false,
      });

      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();
      await pageObjects.observabilityNavigation.waitForLoad();

      const nav = pageObjects.observabilityNavigation;

      await test.step('Alerts panel opener is visible', async () => {
        await expect(nav.navItemInPrimaryById(ALERTS_PANEL_ID)).toBeVisible();
      });

      await test.step('panel contains Inbox but not Alerts V1', async () => {
        await nav.navItemInPrimaryById(ALERTS_PANEL_ID).click();
        await expect(nav.sidePanel(ALERTS_PANEL_ID)).toBeVisible();

        await expect(
          nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, 'management:episodes')
        ).toBeVisible();
        await expect(
          nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, ALERTS_DEEP_LINK)
        ).not.toBeVisible();
      });
    });

    test('shows Alerts V1 link when showClassicAlertsTable is on', async ({
      browserAuth,
      pageObjects,
      kbnClient,
      scoutSpace,
    }) => {
      await kbnClient.uiSettings.updateGlobal({ [ALERTING_V2_ENABLED_SETTING_ID]: true });
      await scoutSpace.uiSettings.set({
        [ALERTING_V2_SHOW_CLASSIC_ALERTS_TABLE_SETTING_ID]: true,
      });

      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();
      await pageObjects.observabilityNavigation.waitForLoad();

      const nav = pageObjects.observabilityNavigation;

      await test.step('panel contains both Inbox and Alerts V1', async () => {
        await nav.navItemInPrimaryById(ALERTS_PANEL_ID).click();
        await expect(nav.sidePanel(ALERTS_PANEL_ID)).toBeVisible();

        await expect(
          nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, 'management:episodes')
        ).toBeVisible();
        await expect(
          nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, ALERTS_DEEP_LINK)
        ).toBeVisible();
      });

      await test.step('panel contains Rule Management section', async () => {
        await expect(
          nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, 'management:rules')
        ).toBeVisible();
        await expect(
          nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, 'management:rule_library')
        ).toBeVisible();
      });

      await test.step('panel contains Notifications and Suppressions section', async () => {
        await expect(
          nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, 'management:action_policies')
        ).toBeVisible();
        await expect(
          nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, 'management:maintenanceWindows')
        ).toBeVisible();
      });

      await test.step('panel contains Operations section', async () => {
        await expect(
          nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, 'management:execution_history')
        ).toBeVisible();
      });
    });

    test('reverts to plain Alerts link after disabling alerting v2', async ({
      browserAuth,
      pageObjects,
      kbnClient,
      scoutSpace,
    }) => {
      await kbnClient.uiSettings.updateGlobal({ [ALERTING_V2_ENABLED_SETTING_ID]: false });
      await scoutSpace.uiSettings.set({
        [ALERTING_V2_SHOW_CLASSIC_ALERTS_TABLE_SETTING_ID]: false,
      });

      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();
      await pageObjects.observabilityNavigation.waitForLoad();

      const nav = pageObjects.observabilityNavigation;

      const alertsLink = nav.navItemInPrimaryByDeepLinkId(ALERTS_DEEP_LINK);
      await expect(alertsLink).toBeVisible();

      const alertsPanel = nav.navItemInPrimaryById(ALERTS_PANEL_ID);
      await expect(alertsPanel).not.toBeVisible();
    });
  }
);
