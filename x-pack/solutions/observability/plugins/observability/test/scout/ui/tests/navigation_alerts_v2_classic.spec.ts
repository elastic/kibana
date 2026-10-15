/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Sequential (`tests/`, not `parallel_tests/`) because it toggles
 * `alerting:v2:enabled`, a server-wide global setting.
 *
 * Covers the labeled "Alerting" section of the classic Observability in-app
 * sub-nav (space solution view `classic`). The solution-nav panel for the
 * Observability view is covered by `navigation_alerts_v2.spec.ts`.
 */

import { ALERTING_V2_SHOW_V1_OBSERVABILITY_ALERTS_TABLE_SETTING_ID } from '@kbn/alerting-v2-constants';
import type { KibanaRole } from '@kbn/scout-oblt';
import {
  OBSERVABILITY_SPA_SHELL_TIMEOUT_MS,
  spaceTest as test,
  tags,
  type Locator,
  type ScoutPage,
} from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import {
  setAlertingV2EnabledSetting,
  setAlertingV2NavSettings,
  unsetAlertingV2EnabledSetting,
} from '../fixtures/alerting_v2_setting';
import { observabilityAlertingNavRole } from '../fixtures/roles';

const NAV_ITEMS = {
  alerts: 'observability-nav-observabilityAlerting-alerts',
  alertsClassicTable: 'observability-nav-observability-overview-alerts_(classic)',
  flatAlerts: 'observability-nav-observability-overview-alerts',
  actionPolicies: 'observability-nav-observabilityAlerting-action_policies',
  executionHistory: 'observability-nav-observabilityAlerting-execution_history',
} as const;

const ALERTING_SECTION_ITEMS = [
  NAV_ITEMS.alerts,
  NAV_ITEMS.actionPolicies,
  NAV_ITEMS.executionHistory,
] as const;

const NAV_TARGETS = [
  { name: 'Alerts', navItem: NAV_ITEMS.alerts, urlRe: /\/app\/observability\/alerting\/alerts/ },
  {
    name: 'Action Policies',
    navItem: NAV_ITEMS.actionPolicies,
    urlRe: /\/app\/observability\/alerting\/action-policies/,
  },
  {
    name: 'Execution History',
    navItem: NAV_ITEMS.executionHistory,
    urlRe: /\/app\/observability\/alerting\/execution-history/,
  },
] as const;

const gotoAlerting = (page: ScoutPage, path: string) =>
  page.gotoApp(`observability/alerting${path}`);

const navItem = (page: ScoutPage, testSubj: string): Locator => page.testSubj.locator(testSubj);

const alertingHeading = (page: ScoutPage, anchorTestSubj: string): Locator =>
  navItem(page, anchorTestSubj)
    .locator('xpath=ancestor::nav[1]')
    .getByText('Alerting', { exact: true });

const expectNavItems = async (
  page: ScoutPage,
  { visible, hidden }: { visible: readonly string[]; hidden: readonly string[] }
) => {
  for (const testSubj of visible) {
    await expect(navItem(page, testSubj)).toBeVisible({
      timeout: OBSERVABILITY_SPA_SHELL_TIMEOUT_MS,
    });
  }
  for (const testSubj of hidden) {
    await expect(navItem(page, testSubj)).toBeHidden();
  }
};

test.describe(
  'Classic Observability nav — Alerting section',
  { tag: tags.stateful.classic },
  () => {
    test.beforeAll(async ({ scoutSpace, kbnClient }) => {
      await scoutSpace.setSolutionView('classic');
      await setAlertingV2NavSettings(kbnClient, scoutSpace, {
        v2Enabled: true,
        showV1AlertsTable: false,
      });
    });

    test.afterAll(async ({ scoutSpace, kbnClient }) => {
      await unsetAlertingV2EnabledSetting(kbnClient);
      await scoutSpace.uiSettings.unset(ALERTING_V2_SHOW_V1_OBSERVABILITY_ALERTS_TABLE_SETTING_ID);
    });

    test('lists the Alerting section without Alerts (Classic) while the V1 table is off', async ({
      browserAuth,
      page,
    }) => {
      await browserAuth.loginAsAdmin();
      await gotoAlerting(page, '/alerts');

      await expect(alertingHeading(page, NAV_ITEMS.alerts)).toBeVisible({
        timeout: OBSERVABILITY_SPA_SHELL_TIMEOUT_MS,
      });
      await expectNavItems(page, {
        visible: ALERTING_SECTION_ITEMS,
        hidden: [NAV_ITEMS.alertsClassicTable, NAV_ITEMS.flatAlerts],
      });
    });

    for (const { name, navItem: target, urlRe } of NAV_TARGETS) {
      test(`opens ${name} under /app/observability/alerting and keeps the sub-nav`, async ({
        browserAuth,
        page,
      }) => {
        await browserAuth.loginAsAdmin();
        await gotoAlerting(page, '/alerts');

        await navItem(page, target).click();

        await expect(page).toHaveURL(urlRe);
        await expectNavItems(page, { visible: ALERTING_SECTION_ITEMS, hidden: [] });
      });
    }

    test('shows Alerts (Classic) and opens the classic table when the V1 table is on', async ({
      browserAuth,
      page,
      kbnClient,
      scoutSpace,
    }) => {
      await setAlertingV2NavSettings(kbnClient, scoutSpace, {
        v2Enabled: true,
        showV1AlertsTable: true,
      });
      await browserAuth.loginAsAdmin();
      await gotoAlerting(page, '/alerts');

      await expect(navItem(page, NAV_ITEMS.alertsClassicTable)).toBeVisible({
        timeout: OBSERVABILITY_SPA_SHELL_TIMEOUT_MS,
      });
      await navItem(page, NAV_ITEMS.alertsClassicTable).click();

      await expect(page).toHaveURL(/\/app\/observability\/alerts(\?|#|$)/);
    });

    test('keeps the classic alerts URL reachable while Alerts (Classic) is hidden', async ({
      browserAuth,
      page,
      kbnClient,
      scoutSpace,
    }) => {
      await setAlertingV2NavSettings(kbnClient, scoutSpace, {
        v2Enabled: true,
        showV1AlertsTable: false,
      });
      await browserAuth.loginAsAdmin();
      await page.gotoApp('observability/alerts');

      await expect(page).toHaveURL(/\/app\/observability\/alerts(\?|#|$)/);
      await expect(navItem(page, NAV_ITEMS.alertsClassicTable)).toBeHidden();
    });

    test('lists only the destinations a restricted role can open', async ({
      browserAuth,
      page,
    }) => {
      const role: KibanaRole = observabilityAlertingNavRole({
        alerting_v2_action_policies: ['read'],
      });
      await browserAuth.loginWithCustomRole(role);
      await gotoAlerting(page, '/action-policies');

      await expect(alertingHeading(page, NAV_ITEMS.actionPolicies)).toBeVisible({
        timeout: OBSERVABILITY_SPA_SHELL_TIMEOUT_MS,
      });
      await expectNavItems(page, {
        visible: [NAV_ITEMS.actionPolicies],
        hidden: [NAV_ITEMS.alerts, NAV_ITEMS.executionHistory],
      });
    });

    test('shows the flat Alerts entry and no Alerting section when v2 is off', async ({
      browserAuth,
      page,
      kbnClient,
    }) => {
      await setAlertingV2EnabledSetting(kbnClient, false);
      await browserAuth.loginAsAdmin();
      await page.gotoApp('observability/alerts');

      await expect(navItem(page, NAV_ITEMS.flatAlerts)).toBeVisible({
        timeout: OBSERVABILITY_SPA_SHELL_TIMEOUT_MS,
      });
      await expectNavItems(page, {
        visible: [],
        hidden: [...ALERTING_SECTION_ITEMS, NAV_ITEMS.alertsClassicTable],
      });
    });
  }
);
