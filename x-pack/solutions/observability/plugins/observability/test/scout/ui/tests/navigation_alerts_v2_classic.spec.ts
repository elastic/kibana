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
import { spaceTest as test, tags, OBSERVABILITY_SPA_SHELL_TIMEOUT_MS } from '@kbn/scout-oblt';
import type { ObservabilityNavigation, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';

const ALERTS_PANEL_ID = 'alerting';
const CLASSIC_ALERTS_APP_ID = 'observability-overview';
const CLASSIC_ALERTS_NAV_ID = 'alerts';

const expectClassicAlertsLinkUnchanged = async (
  nav: ObservabilityNavigation,
  page: ScoutPage
): Promise<void> => {
  const alertsLink = nav.classicSidebarNavItem(CLASSIC_ALERTS_APP_ID, CLASSIC_ALERTS_NAV_ID);

  await test.step('Alerts link is a plain item in the classic Observability sidenav', async () => {
    await expect(alertsLink).toBeVisible({ timeout: OBSERVABILITY_SPA_SHELL_TIMEOUT_MS });
    await expect(alertsLink).toHaveAttribute('href', /\/app\/observability\/alerts/);
  });

  await test.step('clicking Alerts navigates to the alerts page', async () => {
    await alertsLink.click();
    await expect(page).toHaveURL(/\/app\/observability\/alerts/);
  });

  await test.step('v2 Alerts panel opener is not rendered', async () => {
    await expect(nav.navItemInSidenavById(ALERTS_PANEL_ID)).not.toBeVisible();
  });
};

test.describe(
  'Observability Alerts nav — classic sidebar',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeAll(async ({ scoutSpace, kbnClient }) => {
      await scoutSpace.setSolutionView('classic');
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

    test('Alerts link navigates to observability alerts with no feature flags', async ({
      browserAuth,
      pageObjects,
      page,
    }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();

      await expectClassicAlertsLinkUnchanged(pageObjects.observabilityNavigation, page);
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

      await expectClassicAlertsLinkUnchanged(pageObjects.observabilityNavigation, page);
    });

    test('Alerts link is unchanged when both flags are enabled', async ({
      browserAuth,
      pageObjects,
      page,
      kbnClient,
      scoutSpace,
    }) => {
      await kbnClient.uiSettings.updateGlobal({ [ALERTING_V2_ENABLED_SETTING_ID]: true });
      await scoutSpace.uiSettings.set({
        [ALERTING_V2_SHOW_CLASSIC_ALERTS_TABLE_SETTING_ID]: true,
      });

      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();

      await expectClassicAlertsLinkUnchanged(pageObjects.observabilityNavigation, page);
    });
  }
);
