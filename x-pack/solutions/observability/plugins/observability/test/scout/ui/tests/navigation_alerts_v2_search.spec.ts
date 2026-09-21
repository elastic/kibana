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
 * Jest already covers `visibleIn` on Observability Alerting deep links. This
 * suite searches Chrome as one authorized custom role and one role that lacks
 * that surface.
 */

import type { KibanaRole } from '@kbn/scout-oblt';
import {
  OBSERVABILITY_SPA_SHELL_TIMEOUT_MS,
  spaceTest as test,
  tags,
  type ObservabilityNavigation,
} from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import {
  setAlertingV2EnabledSetting,
  unsetAlertingV2EnabledSetting,
} from '../fixtures/alerting_v2_setting';
import { observabilityAlertingNavRole } from '../fixtures/roles';

const ACTION_POLICIES_TITLE = 'Action Policies';
const ACTION_POLICIES_PATH = '/app/observability/alerting/action-policies';
const ALERTS_PATH = '/app/observability/alerting/alerts';

const spaceAppUrl = (spaceId: string, path: string): string => `/s/${spaceId}${path}`;

const loadDiscoverAsRole = async (
  browserAuth: { loginWithCustomRole: (role: KibanaRole) => Promise<void> },
  nav: ObservabilityNavigation,
  role: KibanaRole
): Promise<void> => {
  await browserAuth.loginWithCustomRole(role);
  await nav.gotoApp('discover');
  await nav.waitForLoad();
};

test.describe(
  'Observability Alerting global search — alerting v2',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ scoutSpace, kbnClient, config }) => {
      if (!config.serverless) {
        await scoutSpace.setSolutionView('oblt');
      }
      await setAlertingV2EnabledSetting(kbnClient, true);
    });

    test.afterAll(async ({ kbnClient }) => {
      await unsetAlertingV2EnabledSetting(kbnClient);
      await kbnClient.uiSettings.waitForEventualCacheRefresh();
    });

    test('offers Action Policies in global search when the user has v2 action policies read', async ({
      browserAuth,
      pageObjects,
      scoutSpace,
    }) => {
      const { observabilityNavigation: nav, chrome } = pageObjects;
      await loadDiscoverAsRole(
        browserAuth,
        nav,
        observabilityAlertingNavRole({ alerting_v2_action_policies: ['read'] })
      );

      await chrome.openSearch();
      await chrome.search(ACTION_POLICIES_TITLE);

      await expect(
        chrome.getSearchOptionByUrl(spaceAppUrl(scoutSpace.id, ACTION_POLICIES_PATH))
      ).toBeVisible({
        timeout: OBSERVABILITY_SPA_SHELL_TIMEOUT_MS,
      });
    });

    test('hides Action Policies from global search when the user only has v2 alerts read', async ({
      browserAuth,
      pageObjects,
      scoutSpace,
    }) => {
      const { observabilityNavigation: nav, chrome } = pageObjects;
      await loadDiscoverAsRole(
        browserAuth,
        nav,
        observabilityAlertingNavRole({ alerting_v2_alerts: ['read'] })
      );

      await chrome.openSearch();
      await chrome.search(ACTION_POLICIES_TITLE);
      await expect
        .poll(
          async () =>
            (await chrome.searchNoResults.isVisible()) || (await chrome.searchOptions.count()) > 0,
          { timeout: OBSERVABILITY_SPA_SHELL_TIMEOUT_MS }
        )
        .toBeTruthy();
      await expect(
        chrome.getSearchOptionByUrl(spaceAppUrl(scoutSpace.id, ACTION_POLICIES_PATH))
      ).toHaveCount(0);

      await chrome.search('episodes');
      await expect(
        chrome.getSearchOptionByUrl(spaceAppUrl(scoutSpace.id, ALERTS_PATH))
      ).toBeVisible({
        timeout: OBSERVABILITY_SPA_SHELL_TIMEOUT_MS,
      });
    });
  }
);
