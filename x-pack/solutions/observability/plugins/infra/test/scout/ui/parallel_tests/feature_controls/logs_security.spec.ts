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
  // The FTR also asserted the read-only badge for logs privileges, but it checked
  // it on the post-login page without opening the logs app. The classic Logs UI
  // (`/app/logs`) is deprecated and redirects minimal-privilege roles to a Logs
  // Explorer/Discover destination they can't access ("Application not found"), so
  // there's no stable logs page to read the badge from. The read-only badge
  // mechanic is fully covered by the infrastructure security suite instead; here
  // we keep the faithful, deployment-stable check: the logs feature drives nav
  // link visibility.
  test('with logs all privileges shows the Logs nav link', async ({
    browserAuth,
    pageObjects: { featureControlsPage, collapsibleNav },
  }) => {
    await browserAuth.loginWithCustomRole(globalLogsAll);
    await featureControlsPage.gotoHome();
    await collapsibleNav.expandNav();
    await expect(featureControlsPage.getNavLink('Logs')).toBeVisible({
      timeout: EXTENDED_TIMEOUT,
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
