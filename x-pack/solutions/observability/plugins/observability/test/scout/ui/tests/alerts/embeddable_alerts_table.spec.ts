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
import {
  LOGS_DASHBOARD_ROLE,
  OBSERVABILITY_ALERTS_ONLY_DASHBOARD_ROLE,
} from '../../fixtures/roles';
import type { EmbeddableAlertsIngestResult } from '../../fixtures/embeddable_alerts_data';
import { cleanEmbeddableAlert, ingestEmbeddableAlert } from '../../fixtures/embeddable_alerts_data';

// Test subjects owned by the embeddable_alerts_table plugin (add-panel action
// display name "Alerts") and the response-ops alerts table.
const ADD_ALERTS_PANEL_ACTION_SUBJ = 'create-action-Alerts';
const SAVE_CONFIG_BUTTON_SUBJ = 'saveConfigButton';
const ALERTS_TABLE_LOADED_SUBJ = 'alertsTableIsLoaded';
const ALERTS_ROW_CELL_SUBJ = 'dataGridRowCell';

// The alerts-only user is the one that regressed before the `includeAlertAuthorized`
// fix; the logs user exercises the pre-existing `rule` authorization path.
const CASES: Array<{ title: string; role: KibanaRole }> = [
  {
    title: 'observability alerts-only user (observabilityAlerts)',
    role: OBSERVABILITY_ALERTS_ONLY_DASHBOARD_ROLE,
  },
  {
    title: 'logs user (logs)',
    role: LOGS_DASHBOARD_ROLE,
  },
];

test.describe(
  'Embeddable alerts table - observability add panel authorization',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let ingested: EmbeddableAlertsIngestResult;

    test.beforeAll(async ({ esClient }) => {
      ingested = await ingestEmbeddableAlert({ esClient, timestamp: new Date().toISOString() });
    });

    test.afterAll(async ({ esClient }) => {
      await cleanEmbeddableAlert({ esClient, cleanupTag: ingested.cleanupTag });
    });

    for (const { title, role } of CASES) {
      test(`${title} can add an alerts panel and see alerts`, async ({
        page,
        browserAuth,
        pageObjects,
      }) => {
        await browserAuth.loginWithCustomRole(role);

        await test.step('open a new dashboard and the add-panel flyout', async () => {
          await pageObjects.dashboard.openNewDashboard();
          await pageObjects.dashboard.openAddPanelFlyout();
        });

        await test.step('the alerts panel option is offered', async () => {
          await expect(page.testSubj.locator(ADD_ALERTS_PANEL_ACTION_SUBJ)).toBeVisible();
        });

        await test.step('configure and save the alerts panel', async () => {
          await page.testSubj.click(ADD_ALERTS_PANEL_ACTION_SUBJ);
          const saveButton = page.testSubj.locator(SAVE_CONFIG_BUTTON_SUBJ);
          await expect(saveButton).toBeVisible();
          // The single available solution auto-selects once rule types load, enabling Save.
          await saveButton.click();
          await expect(saveButton).toBeHidden();
        });

        await test.step('the panel renders the authorized alerts', async () => {
          await expect(page.testSubj.locator(ALERTS_TABLE_LOADED_SUBJ)).toBeVisible({
            timeout: 60_000,
          });
          await expect
            .poll(async () => page.testSubj.locator(ALERTS_ROW_CELL_SUBJ).count(), {
              timeout: 60_000,
            })
            .toBeGreaterThan(0);
        });
      });
    }
  }
);
