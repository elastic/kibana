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
import {
  createConsumerVisibilityDashboard,
  deleteConsumerVisibilityDashboard,
} from '../../fixtures/consumer_visibility_dashboard';

// The alerts-only user regressed before the `includeAlertViewableTypes` fix; the logs user
// exercises the pre-existing `rule` authorization path.
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

// The dashboard and its alerts panel are provisioned via the saved objects API so each
// test asserts only panel visibility, not the add-panel authoring flow.
test.describe(
  'Embeddable alerts table - observability alerts panel authorization',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let ingested: EmbeddableAlertsIngestResult;
    let dashboardId: string;

    test.beforeAll(async ({ esClient, kbnClient }) => {
      ingested = await ingestEmbeddableAlert({ esClient, timestamp: new Date().toISOString() });
      dashboardId = await createConsumerVisibilityDashboard(kbnClient, {
        solution: 'observability',
        tag: ingested.cleanupTag,
        title: 'Alerts panel authorization',
      });
    });

    test.afterAll(async ({ esClient, kbnClient }) => {
      await deleteConsumerVisibilityDashboard(kbnClient, dashboardId);
      await cleanEmbeddableAlert({ esClient, cleanupTag: ingested.cleanupTag });
    });

    for (const { title, role } of CASES) {
      test(`${title} sees alerts in a pre-configured alerts panel`, async ({
        browserAuth,
        pageObjects,
      }) => {
        await browserAuth.loginWithCustomRole(role);

        await test.step('open the dashboard that already contains the alerts panel', async () => {
          await pageObjects.dashboard.openDashboardWithId(dashboardId);
        });

        await test.step('the panel renders the authorized alerts', async () => {
          await expect(pageObjects.embeddableAlertsTable.alertsTableLoaded).toBeVisible({
            timeout: 30_000,
          });
          await expect
            .poll(async () => pageObjects.embeddableAlertsTable.getAlertRowCount(), {
              timeout: 30_000,
            })
            .toBeGreaterThan(0);
        });
      });
    }
  }
);
