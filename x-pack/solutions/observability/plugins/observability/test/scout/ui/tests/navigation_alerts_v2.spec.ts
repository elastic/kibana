/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Sequential (`tests/`, not `parallel_tests/`) because it toggles
 * `alerting:v2:enabled`, a server-wide global setting. Parallel workers would
 * leak that change into other suites.
 *
 * Runs on stateful classic (oblt solution view) and serverless Observability
 * complete. Alerts sits at the primary/More overflow boundary on serverless,
 * so locators go through `revealBodyNavItem*` / `anyPanel`.
 *
 * Page-load titles match `observability_alerting` URL Scout coverage, but this
 * suite reaches each surface by clicking the solution-nav link.
 */

import { ALERTING_V2_SHOW_CLASSIC_ALERTS_TABLE_SETTING_ID } from '@kbn/alerting-v2-constants';
import {
  OBSERVABILITY_SPA_SHELL_TIMEOUT_MS,
  spaceTest as test,
  tags,
  type Locator,
  type ObservabilityNavigation,
} from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import {
  setAlertingV2EnabledSetting,
  unsetAlertingV2EnabledSetting,
} from '../fixtures/alerting_v2_setting';

const ALERTS_PANEL_ID = 'alerting';
const ALERTS_DEEP_LINK = 'observability-overview:alerts';
const CLASSIC_ALERTS_TITLE = 'Alerts';

const PANEL_LINKS = {
  inbox: 'observabilityAlerting:inbox',
  rulesV2: 'observabilityAlerting:rules-v2',
  rulesV1: 'observabilityAlerting:rules-v1',
  ruleLibrary: 'observabilityAlerting:rule-library',
  actionPolicies: 'observabilityAlerting:action-policies',
  maintenanceWindows: 'management:maintenanceWindows',
  executionHistory: 'observabilityAlerting:execution-history',
} as const;

/**
 * Visible panel children when v2 is on. Titles match
 * `OBSERVABILITY_ALERTING_SURFACES` plus Maintenance Windows.
 * `rules-v1` stays hidden in the side nav and is covered by the URL suite.
 */
const V2_PANEL_PAGES = [
  { name: 'Inbox', deepLinkId: PANEL_LINKS.inbox, title: 'Alert episodes' },
  { name: 'Rules', deepLinkId: PANEL_LINKS.rulesV2, title: 'Rules' },
  { name: 'Rule library', deepLinkId: PANEL_LINKS.ruleLibrary, title: 'Rule library' },
  { name: 'Action Policies', deepLinkId: PANEL_LINKS.actionPolicies, title: 'Action Policies' },
  {
    name: 'Maintenance Windows',
    deepLinkId: PANEL_LINKS.maintenanceWindows,
    title: 'Maintenance Windows',
  },
  {
    name: 'Execution history',
    deepLinkId: PANEL_LINKS.executionHistory,
    title: 'Execution history',
  },
] as const;

const expectPageTitle = async (pageTitle: Locator, title: string) => {
  await expect(pageTitle).toHaveText(title, {
    timeout: OBSERVABILITY_SPA_SHELL_TIMEOUT_MS,
  });
};

const expectPlainAlertsLink = async (nav: ObservabilityNavigation) => {
  const alertsLink = await nav.revealBodyNavItemByDeepLinkId(ALERTS_DEEP_LINK);
  await expect(alertsLink).toBeVisible({ timeout: OBSERVABILITY_SPA_SHELL_TIMEOUT_MS });
  await expect(alertsLink).toHaveAttribute('href', /\/app\/observability\/alerts/);
  await expect(nav.navItemInBodyById(ALERTS_PANEL_ID)).not.toBeVisible();
};

test.describe(
  'Observability Alerts nav — alerting v2 feature flag',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ scoutSpace, kbnClient, config }) => {
      // Serverless Observability is already the observability project; solution
      // view is a stateful-spaces API.
      if (!config.serverless) {
        await scoutSpace.setSolutionView('oblt');
      }
      await unsetAlertingV2EnabledSetting(kbnClient);
      await scoutSpace.uiSettings.set({
        [ALERTING_V2_SHOW_CLASSIC_ALERTS_TABLE_SETTING_ID]: false,
      });
    });

    test.afterAll(async ({ scoutSpace, kbnClient }) => {
      await unsetAlertingV2EnabledSetting(kbnClient);
      await scoutSpace.uiSettings.unset(ALERTING_V2_SHOW_CLASSIC_ALERTS_TABLE_SETTING_ID);
    });

    test('shows a plain Alerts link that loads the classic alerts page when v2 is disabled', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();
      await pageObjects.observabilityNavigation.waitForLoad();

      const nav = pageObjects.observabilityNavigation;
      await expectPlainAlertsLink(nav);
      await nav.clickBodyNavItemByDeepLinkId(ALERTS_DEEP_LINK);
      await expectPageTitle(pageObjects.chrome.pageTitle, CLASSIC_ALERTS_TITLE);
    });

    test('opens an Alerts panel without Alerts V1 when v2 is on and the classic table is off', async ({
      browserAuth,
      pageObjects,
      kbnClient,
      scoutSpace,
    }) => {
      await setAlertingV2EnabledSetting(kbnClient, true);
      await scoutSpace.uiSettings.set({
        [ALERTING_V2_SHOW_CLASSIC_ALERTS_TABLE_SETTING_ID]: false,
      });

      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();
      await pageObjects.observabilityNavigation.waitForLoad();

      const nav = pageObjects.observabilityNavigation;

      await test.step('Alerts panel opener is visible', async () => {
        await nav.openPanelById(ALERTS_PANEL_ID);
      });

      await test.step('panel contains Inbox but not Alerts V1', async () => {
        await expect(
          nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, PANEL_LINKS.inbox)
        ).toBeVisible({
          timeout: OBSERVABILITY_SPA_SHELL_TIMEOUT_MS,
        });
        await expect(
          nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, ALERTS_DEEP_LINK)
        ).not.toBeVisible();
      });

      await test.step('panel contains Rule Management, Notifications, and Operations', async () => {
        await expect(
          nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, PANEL_LINKS.rulesV2)
        ).toBeVisible();
        await expect(
          nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, PANEL_LINKS.ruleLibrary)
        ).toBeVisible();
        await expect(
          nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, PANEL_LINKS.actionPolicies)
        ).toBeVisible();
        await expect(
          nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, PANEL_LINKS.maintenanceWindows)
        ).toBeVisible();
        await expect(
          nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, PANEL_LINKS.executionHistory)
        ).toBeVisible();
        await expect(
          nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, PANEL_LINKS.rulesV1)
        ).not.toBeVisible();
      });
    });

    for (const surface of V2_PANEL_PAGES) {
      test(`clicking ${surface.name} loads ${surface.title} when alerting v2 is enabled`, async ({
        browserAuth,
        pageObjects,
        kbnClient,
        scoutSpace,
      }) => {
        await setAlertingV2EnabledSetting(kbnClient, true);
        await scoutSpace.uiSettings.set({
          [ALERTING_V2_SHOW_CLASSIC_ALERTS_TABLE_SETTING_ID]: false,
        });

        await browserAuth.loginAsAdmin();
        await pageObjects.observabilityNavigation.goto();
        await pageObjects.observabilityNavigation.waitForLoad();

        await pageObjects.observabilityNavigation.clickPanelNavItemByDeepLinkId(
          ALERTS_PANEL_ID,
          surface.deepLinkId
        );
        await expectPageTitle(pageObjects.chrome.pageTitle, surface.title);
      });
    }

    test('clicking Alerts V1 loads the classic alerts page when the classic table setting is on', async ({
      browserAuth,
      pageObjects,
      kbnClient,
      scoutSpace,
    }) => {
      await setAlertingV2EnabledSetting(kbnClient, true);
      await scoutSpace.uiSettings.set({
        [ALERTING_V2_SHOW_CLASSIC_ALERTS_TABLE_SETTING_ID]: true,
      });

      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();
      await pageObjects.observabilityNavigation.waitForLoad();

      const nav = pageObjects.observabilityNavigation;
      await nav.openPanelById(ALERTS_PANEL_ID);

      await expect(nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, PANEL_LINKS.inbox)).toBeVisible({
        timeout: OBSERVABILITY_SPA_SHELL_TIMEOUT_MS,
      });
      await expect(nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, ALERTS_DEEP_LINK)).toBeVisible({
        timeout: OBSERVABILITY_SPA_SHELL_TIMEOUT_MS,
      });

      await nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, ALERTS_DEEP_LINK).click();
      await expectPageTitle(pageObjects.chrome.pageTitle, CLASSIC_ALERTS_TITLE);
    });

    test('reverts to a plain Alerts link that loads the classic alerts page after disabling v2', async ({
      browserAuth,
      pageObjects,
      kbnClient,
      scoutSpace,
    }) => {
      await setAlertingV2EnabledSetting(kbnClient, false);
      await scoutSpace.uiSettings.set({
        [ALERTING_V2_SHOW_CLASSIC_ALERTS_TABLE_SETTING_ID]: false,
      });

      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();
      await pageObjects.observabilityNavigation.waitForLoad();

      const nav = pageObjects.observabilityNavigation;
      await expectPlainAlertsLink(nav);
      await nav.clickBodyNavItemByDeepLinkId(ALERTS_DEEP_LINK);
      await expectPageTitle(pageObjects.chrome.pageTitle, CLASSIC_ALERTS_TITLE);
    });
  }
);
