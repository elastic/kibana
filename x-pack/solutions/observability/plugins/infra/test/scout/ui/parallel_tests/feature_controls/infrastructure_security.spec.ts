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
import { EXTENDED_TIMEOUT, METRICS_AND_LOGS_DATE_WITH_DATA } from '../../fixtures/constants';

const ES_METRICBEAT_READ = {
  cluster: [],
  indices: [{ names: ['metricbeat-*'], privileges: ['read', 'view_index_metadata'] }],
};

const globalInfrastructureAll: KibanaRole = {
  elasticsearch: ES_METRICBEAT_READ,
  kibana: [{ base: [], feature: { infrastructure: ['all'] }, spaces: ['*'] }],
};

const globalInfrastructureRead: KibanaRole = {
  elasticsearch: ES_METRICBEAT_READ,
  kibana: [{ base: [], feature: { infrastructure: ['read'] }, spaces: ['*'] }],
};

// Mirrors the FTR `no_infrastructure_privileges_role`: holds another Kibana
// feature (logs) but no infrastructure privilege, so the metrics app must 403.
const noInfrastructurePrivileges: KibanaRole = {
  elasticsearch: ES_METRICBEAT_READ,
  kibana: [{ base: [], feature: { logs: ['all'] }, spaces: ['*'] }],
};

test.describe('Infrastructure feature controls - security', { tag: tags.stateful.classic }, () => {
  test('with infrastructure all privileges shows the nav link and no read-only badge', async ({
    browserAuth,
    pageObjects: { featureControlsPage, collapsibleNav },
  }) => {
    await featureControlsPage.forceInfraNoData();
    await browserAuth.loginWithCustomRole(globalInfrastructureAll);

    await test.step('shows the Infrastructure nav link', async () => {
      await featureControlsPage.gotoHome();
      await collapsibleNav.expandNav();
      await expect(featureControlsPage.getNavLink('Infrastructure')).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
    });

    await test.step('can access the Infrastructure app without a read-only badge', async () => {
      await featureControlsPage.gotoInfrastructure();
      await expect(featureControlsPage.infraNoDataPage).toBeVisible({ timeout: EXTENDED_TIMEOUT });
      await expect(featureControlsPage.readOnlyBadge).toBeHidden();
    });
  });

  test('with infrastructure all privileges renders inventory data without a read-only badge', async ({
    browserAuth,
    pageObjects: { featureControlsPage, inventoryPage },
  }) => {
    await browserAuth.loginWithCustomRole(globalInfrastructureAll);

    await inventoryPage.goToPage();
    await inventoryPage.goToTime(METRICS_AND_LOGS_DATE_WITH_DATA);

    await expect(inventoryPage.waffleMap).toBeVisible({ timeout: EXTENDED_TIMEOUT });
    await expect(featureControlsPage.readOnlyBadge).toBeHidden();
  });

  test('with infrastructure read privileges shows the nav link and a read-only badge', async ({
    browserAuth,
    pageObjects: { featureControlsPage, collapsibleNav },
  }) => {
    await featureControlsPage.forceInfraNoData();
    await browserAuth.loginWithCustomRole(globalInfrastructureRead);

    await test.step('shows the Infrastructure nav link', async () => {
      await featureControlsPage.gotoHome();
      await collapsibleNav.expandNav();
      await expect(featureControlsPage.getNavLink('Infrastructure')).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
    });

    await test.step('can access the Infrastructure app and shows the read-only badge', async () => {
      await featureControlsPage.gotoInfrastructure();
      await expect(featureControlsPage.infraNoDataPage).toBeVisible({ timeout: EXTENDED_TIMEOUT });
      await expect(featureControlsPage.readOnlyBadge).toBeVisible({ timeout: EXTENDED_TIMEOUT });
      await expect(featureControlsPage.readOnlyBadge).toHaveAttribute(
        'data-test-badge-label',
        'Read only'
      );
    });
  });

  test('with infrastructure read privileges renders inventory data with a read-only badge', async ({
    browserAuth,
    pageObjects: { featureControlsPage, inventoryPage },
  }) => {
    await browserAuth.loginWithCustomRole(globalInfrastructureRead);

    await inventoryPage.goToPage();
    await inventoryPage.goToTime(METRICS_AND_LOGS_DATE_WITH_DATA);

    await expect(inventoryPage.waffleMap).toBeVisible({ timeout: EXTENDED_TIMEOUT });
    await expect(featureControlsPage.readOnlyBadge).toBeVisible({ timeout: EXTENDED_TIMEOUT });
    await expect(featureControlsPage.readOnlyBadge).toHaveAttribute(
      'data-test-badge-label',
      'Read only'
    );
  });

  test('without infrastructure privileges hides the nav link and blocks the app', async ({
    browserAuth,
    page,
    pageObjects: { featureControlsPage, collapsibleNav },
  }) => {
    await browserAuth.loginWithCustomRole(noInfrastructurePrivileges);

    await test.step(`doesn't show the Infrastructure nav link`, async () => {
      await featureControlsPage.gotoHome();
      await collapsibleNav.expandNav();
      await expect(featureControlsPage.getNavLink('Infrastructure')).toBeHidden();
    });

    await test.step('renders the no-permission page for the metrics app', async () => {
      await featureControlsPage.gotoInfrastructure();
      await expect(
        page.getByText('You do not have permission to access the requested page')
      ).toBeVisible({ timeout: EXTENDED_TIMEOUT });
    });
  });
});
