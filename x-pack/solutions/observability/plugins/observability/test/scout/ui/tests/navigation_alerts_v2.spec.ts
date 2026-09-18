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
 * suite reaches each surface by clicking the solution-nav link. Privilege cases
 * login as custom roles and assert which panel children render.
 */

import { ALERTING_V2_SHOW_CLASSIC_ALERTS_PAGE_SETTING_ID } from '@kbn/alerting-v2-constants';
import type { KibanaRole } from '@kbn/scout-oblt';
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
  setAlertingV2NavSettings,
  unsetAlertingV2EnabledSetting,
} from '../fixtures/alerting_v2_setting';
import { observabilityAlertingNavRole } from '../fixtures/roles';

const ALERTS_PANEL_ID = 'alerting';
const ALERTS_DEEP_LINK = 'observability-overview:alerts';
const CLASSIC_ALERTS_TITLE = 'Alerts';

const PANEL_LINKS = {
  alerts: 'observabilityAlerting:alerts',
  rulesV2: 'observabilityAlerting:rules-v2',
  rulesV1: 'observabilityAlerting:rules-v1',
  ruleLibrary: 'observabilityAlerting:rule-library',
  actionPolicies: 'observabilityAlerting:action-policies',
  maintenanceWindows: 'management:maintenanceWindows',
  executionHistory: 'observabilityAlerting:execution-history',
} as const;

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

const ALL_PANEL_LINKS = [
  PANEL_LINKS.alerts,
  ALERTS_DEEP_LINK,
  PANEL_LINKS.rulesV2,
  PANEL_LINKS.rulesV1,
  PANEL_LINKS.ruleLibrary,
  PANEL_LINKS.actionPolicies,
  PANEL_LINKS.maintenanceWindows,
  PANEL_LINKS.executionHistory,
] as const;

const PRIVILEGE_CASES = [
  {
    name: 'no alerting privileges',
    role: observabilityAlertingNavRole(),
    visible: [],
  },
  {
    name: 'v2 alerts read',
    role: observabilityAlertingNavRole({ alerting_v2_alerts: ['read'] }),
    visible: [PANEL_LINKS.alerts],
  },
  {
    name: 'v2 rules read',
    role: observabilityAlertingNavRole({ alerting_v2_rules: ['read'] }),
    visible: [PANEL_LINKS.rulesV2],
  },
  {
    name: 'v2 rules write',
    role: observabilityAlertingNavRole({ alerting_v2_rules: ['all'] }),
    visible: [PANEL_LINKS.rulesV2],
  },
  {
    name: 'v2 action policies read',
    role: observabilityAlertingNavRole({ alerting_v2_action_policies: ['read'] }),
    visible: [PANEL_LINKS.actionPolicies],
  },
  {
    name: 'v2 execution history read',
    role: observabilityAlertingNavRole({ alerting_v2_execution_history: ['read'] }),
    visible: [PANEL_LINKS.executionHistory],
  },
  {
    name: 'v1 observability alerts read',
    role: observabilityAlertingNavRole({ observabilityAlerts: ['read'] }),
    visible: [PANEL_LINKS.alerts],
  },
  {
    name: 'v1 logs alerts and rules read',
    role: observabilityAlertingNavRole({ logs: ['read'] }),
    visible: [PANEL_LINKS.alerts, PANEL_LINKS.rulesV1],
  },
] as const;

const loadNavAsRole = async (
  browserAuth: { loginWithCustomRole: (role: KibanaRole) => Promise<void> },
  nav: ObservabilityNavigation,
  role: KibanaRole
): Promise<ObservabilityNavigation> => {
  await browserAuth.loginWithCustomRole(role);
  await nav.gotoApp('discover');
  await nav.waitForLoad();
  return nav;
};

const enableV2AndOpenNav = async ({
  browserAuth,
  pageObjects,
  kbnClient,
  scoutSpace,
}: {
  browserAuth: { loginAsAdmin: () => Promise<void> };
  pageObjects: {
    observabilityNavigation: ObservabilityNavigation;
    chrome: { pageTitle: Locator };
  };
  kbnClient: Parameters<typeof setAlertingV2NavSettings>[0];
  scoutSpace: Parameters<typeof setAlertingV2NavSettings>[1];
}) => {
  await setAlertingV2NavSettings(kbnClient, scoutSpace, {
    v2Enabled: true,
    showClassicAlertsPage: false,
  });
  await browserAuth.loginAsAdmin();
  await pageObjects.observabilityNavigation.goto();
  await pageObjects.observabilityNavigation.waitForLoad();
};

const expectAlertsHiddenFromOverflow = async (nav: ObservabilityNavigation) => {
  await expect(nav.navItemInPrimaryById(ALERTS_PANEL_ID)).not.toBeVisible();
  await expect(nav.navItemInPrimaryByDeepLinkId(ALERTS_DEEP_LINK)).not.toBeVisible();
  if (await nav.moreMenuTrigger.isVisible()) {
    await nav.openMoreMenu();
    await expect(nav.navItemInMoreById(ALERTS_PANEL_ID)).not.toBeVisible();
    await expect(nav.navItemInMoreByDeepLinkId(ALERTS_DEEP_LINK)).not.toBeVisible();
  }
};

const expectPanelLinks = async (nav: ObservabilityNavigation, visible: readonly string[]) => {
  if (visible.length === 0) {
    await expectAlertsHiddenFromOverflow(nav);
    return;
  }

  await nav.openPanelById(ALERTS_PANEL_ID);

  for (const deepLinkId of ALL_PANEL_LINKS) {
    const item = nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, deepLinkId);
    if (visible.includes(deepLinkId)) {
      await expect(item).toBeVisible({ timeout: OBSERVABILITY_SPA_SHELL_TIMEOUT_MS });
    } else {
      await expect(item).not.toBeVisible();
    }
  }
};

test.describe(
  'Observability Alerts nav — alerting v2',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ scoutSpace, kbnClient, config }) => {
      // Serverless Observability is already the observability project; solution
      // view is a stateful-spaces API.
      if (!config.serverless) {
        await scoutSpace.setSolutionView('oblt');
      }
      await setAlertingV2NavSettings(kbnClient, scoutSpace, {
        v2Enabled: false,
        showClassicAlertsPage: false,
      });
    });

    test.afterAll(async ({ scoutSpace, kbnClient }) => {
      await unsetAlertingV2EnabledSetting(kbnClient);
      await scoutSpace.uiSettings.unset(ALERTING_V2_SHOW_CLASSIC_ALERTS_PAGE_SETTING_ID);
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

    test('hides Alerting V2 Preview from project settings when v2 is enabled', async ({
      browserAuth,
      pageObjects,
      kbnClient,
      config,
    }) => {
      await setAlertingV2EnabledSetting(kbnClient, true);

      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();
      await pageObjects.observabilityNavigation.waitForLoad();

      const nav = pageObjects.observabilityNavigation;
      const settingsPanelId = config.serverless ? 'admin_and_settings' : 'stack_management';

      await nav.navItemInFooterById(settingsPanelId).click();
      await expect(nav.sidePanel(settingsPanelId)).toBeVisible({
        timeout: OBSERVABILITY_SPA_SHELL_TIMEOUT_MS,
      });
      await expect(nav.navItemInPanelById(settingsPanelId, 'alerting_v2_panel')).not.toBeVisible();
      await expect(
        nav.sidePanel(settingsPanelId).getByText('Alerting V2 Preview', { exact: true })
      ).not.toBeVisible();
      await expect(
        nav.navItemInPanelById(settingsPanelId, 'management:triggersActions')
      ).toHaveCount(0);
    });

    test('opens an Alerts panel without Alerts V1 when v2 is on and the classic table is off', async ({
      browserAuth,
      pageObjects,
      kbnClient,
      scoutSpace,
    }) => {
      await setAlertingV2NavSettings(kbnClient, scoutSpace, {
        v2Enabled: true,
        showClassicAlertsPage: false,
      });

      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();
      await pageObjects.observabilityNavigation.waitForLoad();

      const nav = pageObjects.observabilityNavigation;

      await test.step('Alerts panel opener is visible', async () => {
        await nav.openPanelById(ALERTS_PANEL_ID);
      });

      await test.step('panel contains Alerts but not Alerts V1', async () => {
        await expect(
          nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, PANEL_LINKS.alerts)
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
        ).not.toBeVisible();
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

    test('clicking Alerts loads Alert episodes when alerting v2 is enabled', async ({
      browserAuth,
      pageObjects,
      kbnClient,
      scoutSpace,
    }) => {
      await enableV2AndOpenNav({ browserAuth, pageObjects, kbnClient, scoutSpace });

      await pageObjects.observabilityNavigation.clickPanelNavItemByDeepLinkId(
        ALERTS_PANEL_ID,
        PANEL_LINKS.alerts
      );
      await expectPageTitle(pageObjects.chrome.pageTitle, 'Alert episodes');
    });

    test('clicking Rules loads Rules when alerting v2 is enabled', async ({
      browserAuth,
      pageObjects,
      kbnClient,
      scoutSpace,
    }) => {
      await enableV2AndOpenNav({ browserAuth, pageObjects, kbnClient, scoutSpace });

      await pageObjects.observabilityNavigation.clickPanelNavItemByDeepLinkId(
        ALERTS_PANEL_ID,
        PANEL_LINKS.rulesV2
      );
      await expectPageTitle(pageObjects.chrome.pageTitle, 'Rules');
    });

    test('clicking Action Policies loads Action Policies when alerting v2 is enabled', async ({
      browserAuth,
      pageObjects,
      kbnClient,
      scoutSpace,
    }) => {
      await enableV2AndOpenNav({ browserAuth, pageObjects, kbnClient, scoutSpace });

      await pageObjects.observabilityNavigation.clickPanelNavItemByDeepLinkId(
        ALERTS_PANEL_ID,
        PANEL_LINKS.actionPolicies
      );
      await expectPageTitle(pageObjects.chrome.pageTitle, 'Action Policies');
    });

    test('clicking Maintenance Windows loads Maintenance Windows when alerting v2 is enabled', async ({
      browserAuth,
      pageObjects,
      kbnClient,
      scoutSpace,
    }) => {
      await enableV2AndOpenNav({ browserAuth, pageObjects, kbnClient, scoutSpace });

      await pageObjects.observabilityNavigation.clickPanelNavItemByDeepLinkId(
        ALERTS_PANEL_ID,
        PANEL_LINKS.maintenanceWindows
      );
      await expectPageTitle(pageObjects.chrome.pageTitle, 'Maintenance Windows');
    });

    test('clicking Execution history loads Execution history when alerting v2 is enabled', async ({
      browserAuth,
      pageObjects,
      kbnClient,
      scoutSpace,
    }) => {
      await enableV2AndOpenNav({ browserAuth, pageObjects, kbnClient, scoutSpace });

      await pageObjects.observabilityNavigation.clickPanelNavItemByDeepLinkId(
        ALERTS_PANEL_ID,
        PANEL_LINKS.executionHistory
      );
      await expectPageTitle(pageObjects.chrome.pageTitle, 'Execution history');
    });

    test('clicking Alerts V1 loads the classic alerts page when the classic table setting is on', async ({
      browserAuth,
      pageObjects,
      kbnClient,
      scoutSpace,
    }) => {
      await setAlertingV2NavSettings(kbnClient, scoutSpace, {
        v2Enabled: true,
        showClassicAlertsPage: true,
      });

      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();
      await pageObjects.observabilityNavigation.waitForLoad();

      const nav = pageObjects.observabilityNavigation;
      await nav.openPanelById(ALERTS_PANEL_ID);

      await expect(nav.navItemInPanelByDeepLinkId(ALERTS_PANEL_ID, PANEL_LINKS.alerts)).toBeVisible(
        {
          timeout: OBSERVABILITY_SPA_SHELL_TIMEOUT_MS,
        }
      );
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
      await setAlertingV2NavSettings(kbnClient, scoutSpace, {
        v2Enabled: false,
        showClassicAlertsPage: false,
      });

      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();
      await pageObjects.observabilityNavigation.waitForLoad();

      const nav = pageObjects.observabilityNavigation;
      await expectPlainAlertsLink(nav);
      await nav.clickBodyNavItemByDeepLinkId(ALERTS_DEEP_LINK);
      await expectPageTitle(pageObjects.chrome.pageTitle, CLASSIC_ALERTS_TITLE);
    });

    test('filters Alerting panel links by the signed-in user privileges', async ({
      browserAuth,
      pageObjects,
      kbnClient,
      scoutSpace,
    }) => {
      // Eight custom-role logins plus three uiSettings cache waits exceed Playwright's 60s default.
      test.setTimeout(240_000);

      await setAlertingV2NavSettings(kbnClient, scoutSpace, {
        v2Enabled: true,
        showClassicAlertsPage: false,
      });

      const nav = pageObjects.observabilityNavigation;

      for (const privilegeCase of PRIVILEGE_CASES) {
        await test.step(privilegeCase.name, async () => {
          await loadNavAsRole(browserAuth, nav, privilegeCase.role);
          await expectPanelLinks(nav, privilegeCase.visible);
        });
      }

      await test.step('v1 observability alerts read and classic table on', async () => {
        await scoutSpace.uiSettings.set({
          [ALERTING_V2_SHOW_CLASSIC_ALERTS_PAGE_SETTING_ID]: true,
        });
        await kbnClient.uiSettings.waitForEventualCacheRefresh();
        try {
          await loadNavAsRole(
            browserAuth,
            nav,
            observabilityAlertingNavRole({ observabilityAlerts: ['read'] })
          );
          await expectPanelLinks(nav, [PANEL_LINKS.alerts, ALERTS_DEEP_LINK]);
        } finally {
          await scoutSpace.uiSettings.set({
            [ALERTING_V2_SHOW_CLASSIC_ALERTS_PAGE_SETTING_ID]: false,
          });
          await kbnClient.uiSettings.waitForEventualCacheRefresh();
        }
      });
    });
  }
);
