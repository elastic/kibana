/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import {
  HOST1_NAME,
  HOST2_NAME,
  HOST3_NAME,
  HOSTS,
  DATE_WITH_HOSTS_DATA_FROM,
  DATE_WITH_HOSTS_DATA_TO,
  EXTENDED_TIMEOUT,
} from '../../fixtures/constants';
import {
  ACTIVE_ALERTS,
  ALL_ALERTS,
  RECOVERED_ALERTS,
  cleanAlertsData,
  ingestAlertsData,
} from '../../fixtures/synthtrace/alerts_data';

const HOSTS_WITH_ALERTS = [HOST1_NAME, HOST2_NAME, HOST3_NAME];

test.describe(
  'Hosts Page - Alerts Tab',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ esClient, apiServices }) => {
      await ingestAlertsData({
        esClient,
        apiServices,
        hosts: HOSTS_WITH_ALERTS,
        timestamp: DATE_WITH_HOSTS_DATA_FROM,
      });
    });

    test.beforeEach(async ({ browserAuth, pageObjects: { hostsPage } }) => {
      await browserAuth.loginAsViewer();
      await hostsPage.goToPage({
        from: DATE_WITH_HOSTS_DATA_FROM,
        to: DATE_WITH_HOSTS_DATA_TO,
        preferredSchema: 'ecs',
      });
      await expect(hostsPage.tableRows).toHaveCount(HOSTS.length, {
        timeout: EXTENDED_TIMEOUT,
      });
    });

    test.afterAll(async ({ esClient, apiServices }) => {
      await cleanAlertsData({ esClient, apiServices });
    });

    test('should correctly load the Alerts tab', async ({ pageObjects: { hostsPage }, page }) => {
      await hostsPage.visitAlertsTab();
      await expect(page.getByTestId('hostsView-alerts')).toBeVisible();
    });

    test('should display the correct active alerts count badge', async ({
      pageObjects: { hostsPage },
    }) => {
      const alertsCount = await hostsPage.getAlertsCount();
      expect(alertsCount).toBe(String(ACTIVE_ALERTS));
    });

    test('should filter alerts to show all statuses', async ({ pageObjects: { hostsPage } }) => {
      await hostsPage.visitAlertsTab();
      await hostsPage.waitForAlertsTableToLoad();
      await hostsPage.setAlertStatusFilter();

      const rowCount = await hostsPage.getAlertsTableRowCount();
      expect(rowCount).toBe(ALL_ALERTS);
    });

    test('should filter alerts to show only active alerts', async ({
      pageObjects: { hostsPage },
    }) => {
      await hostsPage.visitAlertsTab();
      await hostsPage.waitForAlertsTableToLoad();
      await hostsPage.setAlertStatusFilter('active');

      const rowCount = await hostsPage.getAlertsTableRowCount();
      expect(rowCount).toBe(ACTIVE_ALERTS);
    });

    test('should filter alerts to show only recovered alerts', async ({
      pageObjects: { hostsPage },
    }) => {
      await hostsPage.visitAlertsTab();
      await hostsPage.waitForAlertsTableToLoad();
      await hostsPage.setAlertStatusFilter('recovered');

      const rowCount = await hostsPage.getAlertsTableRowCount();
      expect(rowCount).toBe(RECOVERED_ALERTS);
    });

    test('should render the alerts table with cells', async ({ pageObjects: { hostsPage } }) => {
      await hostsPage.visitAlertsTab();
      await hostsPage.waitForAlertsTableToLoad();
      await hostsPage.setAlertStatusFilter();

      const cellCount = await hostsPage.getAlertsTableCells().count();
      expect(cellCount).toBeGreaterThan(0);
    });
  }
);
