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
import type {
  ConsumerVisibilityAlertsState,
  ConsumerVisibilityConsumer,
} from '../../fixtures/embeddable_consumer_alerts_data';
import {
  cleanConsumerVisibilityAlerts,
  ingestConsumerVisibilityAlerts,
} from '../../fixtures/embeddable_consumer_alerts_data';
import {
  createConsumerVisibilityDashboard,
  deleteConsumerVisibilityDashboard,
} from '../../fixtures/consumer_visibility_dashboard';

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

const AUTHORIZED_CONSUMERS: ConsumerVisibilityConsumer[] = ['alerts', 'logs'];
const UNAUTHORIZED_CONSUMERS: ConsumerVisibilityConsumer[] = ['stackAlerts'];

test.describe(
  'Embeddable alerts table - alert consumer visibility',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let alertsState: ConsumerVisibilityAlertsState;
    const dashboardIdsByConsumer: Partial<Record<ConsumerVisibilityConsumer, string>> = {};

    test.beforeAll(async ({ esClient, kbnClient }) => {
      alertsState = await ingestConsumerVisibilityAlerts({
        esClient,
        timestamp: new Date().toISOString(),
      });

      for (const { consumer, tag } of alertsState.alerts) {
        dashboardIdsByConsumer[consumer] = await createConsumerVisibilityDashboard(kbnClient, {
          solution: 'observability',
          tag,
        });
      }
    });

    test.afterAll(async ({ esClient, kbnClient }) => {
      await Promise.all(
        Object.values(dashboardIdsByConsumer).map((dashboardId) =>
          deleteConsumerVisibilityDashboard(kbnClient, dashboardId!)
        )
      );
      await cleanConsumerVisibilityAlerts({ esClient, alerts: alertsState.alerts });
    });

    for (const { title, role } of CASES) {
      for (const consumer of AUTHORIZED_CONSUMERS) {
        test(`${title} sees alerts with consumer ${consumer}`, async ({
          browserAuth,
          pageObjects,
        }) => {
          const dashboardId = dashboardIdsByConsumer[consumer];
          if (!dashboardId) {
            throw new Error(`Missing dashboard for consumer ${consumer}`);
          }

          await browserAuth.loginWithCustomRole(role);

          await test.step('open the tag-scoped alerts panel dashboard', async () => {
            await pageObjects.dashboard.openDashboardWithId(dashboardId);
          });

          await test.step('the alerts table finishes loading', async () => {
            await expect(pageObjects.embeddableAlertsTable.alertsTableLoaded).toBeVisible({
              timeout: 60_000,
            });
          });

          await test.step('the authorized consumer alert is visible', async () => {
            await expect
              .poll(async () => pageObjects.embeddableAlertsTable.getAlertRowCount(), {
                timeout: 60_000,
              })
              .toBeGreaterThan(0);
          });
        });
      }

      for (const consumer of UNAUTHORIZED_CONSUMERS) {
        test(`${title} does not see alerts with consumer ${consumer}`, async ({
          browserAuth,
          pageObjects,
        }) => {
          const dashboardId = dashboardIdsByConsumer[consumer];
          if (!dashboardId) {
            throw new Error(`Missing dashboard for consumer ${consumer}`);
          }

          await browserAuth.loginWithCustomRole(role);

          await test.step('open the tag-scoped alerts panel dashboard', async () => {
            await pageObjects.dashboard.openDashboardWithId(dashboardId);
          });

          await test.step('the alerts table finishes loading with no results', async () => {
            // Zero authorized alerts render the empty state, not alertsTableIsLoaded.
            await expect(pageObjects.embeddableAlertsTable.alertsTableEmptyState).toBeVisible({
              timeout: 60_000,
            });
          });
        });
      }
    }
  }
);
