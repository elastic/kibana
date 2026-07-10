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
        browserAuth,
        pageObjects,
      }) => {
        await browserAuth.loginWithCustomRole(role);

        await test.step('open a new dashboard and the add-panel flyout', async () => {
          // The first dashboard load after logging in with a freshly created custom
          // role resolves capabilities/security server-side, which is slow on cold CI
          // agents and can push the add-panel toolbar past the page object's default
          // 20s/10s waits (see flaky Scout Lane #10 in build 467427). Give it headroom.
          await pageObjects.dashboard.openNewDashboard({ timeout: 60_000 });
          await pageObjects.dashboard.openAddPanelFlyout({ timeout: 30_000 });
        });

        await test.step('the alerts panel option is offered', async () => {
          await expect(pageObjects.embeddableAlertsTable.addAlertsPanelAction).toBeVisible();
        });

        await test.step('configure and save the alerts panel', async () => {
          await pageObjects.embeddableAlertsTable.openConfigEditor();
          await pageObjects.embeddableAlertsTable.saveConfig();
        });

        await test.step('the panel renders the authorized alerts', async () => {
          await expect(pageObjects.embeddableAlertsTable.alertsTableLoaded).toBeVisible({
            timeout: 60_000,
          });
          await expect
            .poll(async () => pageObjects.embeddableAlertsTable.getAlertRowCount(), {
              timeout: 60_000,
            })
            .toBeGreaterThan(0);
        });
      });
    }
  }
);
