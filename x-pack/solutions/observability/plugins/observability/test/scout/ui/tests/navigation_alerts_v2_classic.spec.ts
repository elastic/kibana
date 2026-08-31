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
  'Observability Alerts nav — classic sidebar',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeAll(async ({ scoutSpace, kbnClient }) => {
      await scoutSpace.setSolutionView('classic');
      await kbnClient.uiSettings.updateGlobal({ [ALERTING_V2_ENABLED_SETTING_ID]: false });
      await kbnClient.uiSettings.update({
        [ALERTING_V2_SHOW_CLASSIC_ALERTS_TABLE_SETTING_ID]: false,
      });
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.uiSettings.updateGlobal({ [ALERTING_V2_ENABLED_SETTING_ID]: false });
      await kbnClient.uiSettings.update({
        [ALERTING_V2_SHOW_CLASSIC_ALERTS_TABLE_SETTING_ID]: false,
      });
    });

    test('Alerts link navigates to observability alerts and highlights in the sub-nav with no feature flags', async ({
      browserAuth,
      pageObjects,
      page,
    }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();

      const nav = pageObjects.observabilityNavigation;

      await test.step('Alerts link is visible in the classic nav', async () => {
        const alertsLink = nav.navItemInSidenavByDeepLinkId(ALERTS_DEEP_LINK);
        await expect(alertsLink).toBeVisible();
        await expect(alertsLink).toHaveAttribute('href', /\/app\/observability\/alerts/);
      });

      await test.step('clicking Alerts navigates to the alerts page', async () => {
        await nav.navItemInSidenavByDeepLinkId(ALERTS_DEEP_LINK).click();
        await expect(page).toHaveURL(/\/app\/observability\/alerts/);
      });

      await test.step('Alerts is highlighted as active in the sub-nav', async () => {
        await expect(nav.activeNavItemByDeepLinkId(ALERTS_DEEP_LINK)).toBeVisible();
      });
    });

    test('Alerts link is unchanged when alerting v2 is enabled', async ({
      browserAuth,
      pageObjects,
      page,
      kbnClient,
    }) => {
      await kbnClient.uiSettings.updateGlobal({ [ALERTING_V2_ENABLED_SETTING_ID]: true });

      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();

      const nav = pageObjects.observabilityNavigation;

      await test.step('Alerts link is still a plain nav item', async () => {
        const alertsLink = nav.navItemInSidenavByDeepLinkId(ALERTS_DEEP_LINK);
        await expect(alertsLink).toBeVisible();
        await expect(alertsLink).toHaveAttribute('href', /\/app\/observability\/alerts/);
      });

      await test.step('clicking Alerts navigates to the alerts page', async () => {
        await nav.navItemInSidenavByDeepLinkId(ALERTS_DEEP_LINK).click();
        await expect(page).toHaveURL(/\/app\/observability\/alerts/);
      });

      await test.step('Alerts is highlighted as active', async () => {
        await expect(nav.activeNavItemByDeepLinkId(ALERTS_DEEP_LINK)).toBeVisible();
      });

      await test.step('no panel opener is rendered', async () => {
        await expect(nav.navItemInSidenavById(ALERTS_PANEL_ID)).not.toBeVisible();
      });
    });

    test('Alerts link is unchanged when both flags are enabled', async ({
      browserAuth,
      pageObjects,
      page,
      kbnClient,
    }) => {
      await kbnClient.uiSettings.updateGlobal({ [ALERTING_V2_ENABLED_SETTING_ID]: true });
      await kbnClient.uiSettings.update({
        [ALERTING_V2_SHOW_CLASSIC_ALERTS_TABLE_SETTING_ID]: true,
      });

      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();

      const nav = pageObjects.observabilityNavigation;

      await test.step('Alerts link is still a plain nav item', async () => {
        const alertsLink = nav.navItemInSidenavByDeepLinkId(ALERTS_DEEP_LINK);
        await expect(alertsLink).toBeVisible();
        await expect(alertsLink).toHaveAttribute('href', /\/app\/observability\/alerts/);
      });

      await test.step('clicking Alerts navigates to the alerts page', async () => {
        await nav.navItemInSidenavByDeepLinkId(ALERTS_DEEP_LINK).click();
        await expect(page).toHaveURL(/\/app\/observability\/alerts/);
      });

      await test.step('Alerts is highlighted as active', async () => {
        await expect(nav.activeNavItemByDeepLinkId(ALERTS_DEEP_LINK)).toBeVisible();
      });

      await test.step('no panel opener is rendered', async () => {
        await expect(nav.navItemInSidenavById(ALERTS_PANEL_ID)).not.toBeVisible();
      });
    });
  }
);
