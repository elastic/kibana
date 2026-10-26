/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The new Entity Analytics home page with real roles: the unit tests mock the privilege checks,
 * so only these prove that the checks look at the indices the page's queries read. Sequential, as
 * the new page is behind a server-wide feature flag that parallel suites must not see.
 *
 * To run locally:
 *
 *   node scripts/scout.js run-tests --arch stateful --domain classic \
 *     --testFiles x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/ui/tests/new_home_page_privileges.spec.ts
 */

import { test, tags } from '@kbn/scout-security';
import type { KibanaRole } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

const NEW_HOME_PAGE_FLAG = 'securitySolution.useNewEntityAnalyticsPage';
const ALERTS_INDEX = '.alerts-security.alerts-default';
const HOME_PAGE_PATH = 'security/entity_analytics_home_page';

const getRole = (indices: KibanaRole['elasticsearch']['indices']): KibanaRole => ({
  elasticsearch: { cluster: [], indices },
  kibana: [{ base: [], feature: { siemV5: ['read'] }, spaces: ['*'] }],
});

const NO_INDICES_ROLE = getRole([]);

// The entity store and risk scores, but neither alerts nor ML anomalies.
const NO_ALERTS_OR_ANOMALIES_ROLE = getRole([
  {
    names: ['entities-*', '.entities.*', 'risk-score.risk-score-*'],
    privileges: ['read', 'view_index_metadata'],
  },
]);

test.describe(
  'Entity analytics new home page - Privileges',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': { [NEW_HOME_PAGE_FLAG]: true },
      });
      await apiServices.entityAnalytics.installEntityStoreV2(['host']);
      await apiServices.entityAnalytics.indexEntityStoreEntry('host:scout-host', 'scout-host');
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.entityAnalytics.uninstallEntityStoreV2(['host']);
      await apiServices.core.settings({
        'feature_flags.overrides': { [NEW_HOME_PAGE_FLAG]: null },
      });
    });

    test('shows the no-access screen without read access to the entity store', async ({
      page,
      browserAuth,
    }) => {
      await browserAuth.loginWithCustomRole(NO_INDICES_ROLE);
      await page.gotoApp(HOME_PAGE_PATH);

      await expect(page.testSubj.locator('noPrivilegesPage')).toBeVisible({ timeout: 30000 });
    });

    test('leaves out alerts and anomalies, and says why, without read access to them', async ({
      page,
      browserAuth,
    }) => {
      await browserAuth.loginWithCustomRole(NO_ALERTS_OR_ANOMALIES_ROLE);
      await page.gotoApp(HOME_PAGE_PATH);

      await expect(page.testSubj.locator('dataGridHeaderCell-entity.name')).toBeVisible({
        timeout: 30000,
      });
      await expect(
        page.locator(
          '[data-test-subj^="callout-entity-analytics-home-missing-privileges"][data-test-subj$="__content"]'
        )
      ).toContainText(ALERTS_INDEX);
      // Both alert tiles: entities with alerts and watchlisted entities.
      await expect(page.getByText('Requires read access to alerts')).toHaveCount(2);
      await expect(page.getByText('Requires read access to ML anomalies')).toBeVisible();
      await expect(page.testSubj.locator('dataGridHeaderCell-alert_count')).toBeHidden();
      await expect(page.testSubj.locator('dataGridHeaderCell-anomaly_count')).toBeHidden();
      await expect(
        page.testSubj.locator('globalToastList').getByTestId('euiToastHeader__title')
      ).toHaveCount(0);
    });
  }
);
