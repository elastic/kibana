/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

const ES_METRICBEAT_READ = {
  cluster: [],
  indices: [{ names: ['metricbeat-*'], privileges: ['read', 'view_index_metadata'] }],
};

const globalLogsAll: KibanaRole = {
  elasticsearch: ES_METRICBEAT_READ,
  kibana: [{ base: [], feature: { logs: ['all'] }, spaces: ['*'] }],
};

const globalLogsRead: KibanaRole = {
  elasticsearch: ES_METRICBEAT_READ,
  kibana: [{ base: [], feature: { logs: ['read'] }, spaces: ['*'] }],
};

// Mirrors the FTR `global_logs_no_privileges_role`: holds another Kibana
// feature (infrastructure) but no logs privilege, so the logs app must 403.
const noLogsPrivileges: KibanaRole = {
  elasticsearch: ES_METRICBEAT_READ,
  kibana: [{ base: [], feature: { infrastructure: ['all'] }, spaces: ['*'] }],
};

test.describe('Logs feature controls - security', { tag: tags.stateful.classic }, () => {
  test('with logs all privileges shows the Logs nav link without a read-only badge', async ({
    browserAuth,
    pageObjects: { featureControlsPage, collapsibleNav },
  }) => {
    await browserAuth.loginWithCustomRole(globalLogsAll);

    await test.step('shows the Logs nav link', async () => {
      await featureControlsPage.gotoHome();
      await collapsibleNav.expandNav();
      await expect(featureControlsPage.getNavLink('Logs')).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
    });

    // The badge is only set once the Logs app mounts (`useReadOnlyBadge`), so it
    // has to be asserted from inside the app rather than from the home page.
    await test.step('can access the Logs app without a read-only badge', async () => {
      await featureControlsPage.gotoLogs();
      await expect(featureControlsPage.logsApp).toBeVisible({ timeout: EXTENDED_TIMEOUT });
      await expect(featureControlsPage.readOnlyBadge).toBeHidden();
    });
  });

  test('with logs read privileges shows the Logs nav link', async ({
    browserAuth,
    pageObjects: { featureControlsPage, collapsibleNav },
  }) => {
    await browserAuth.loginWithCustomRole(globalLogsRead);
    await featureControlsPage.gotoHome();
    await collapsibleNav.expandNav();
    await expect(featureControlsPage.getNavLink('Logs')).toBeVisible({
      timeout: EXTENDED_TIMEOUT,
    });
  });

  test('without logs privileges hides the nav link and blocks the app', async ({
    browserAuth,
    page,
    pageObjects: { featureControlsPage, collapsibleNav },
  }) => {
    await browserAuth.loginWithCustomRole(noLogsPrivileges);

    await test.step(`doesn't show the Logs nav link`, async () => {
      await featureControlsPage.gotoHome();
      await collapsibleNav.expandNav();
      await expect(featureControlsPage.getNavLink('Logs')).toBeHidden();
    });

    await test.step('renders the no-permission page for the logs app', async () => {
      await featureControlsPage.gotoLogs();
      await expect(
        page.getByText('You do not have permission to access the requested page')
      ).toBeVisible({ timeout: EXTENDED_TIMEOUT });
    });
  });
});
