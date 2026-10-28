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
} from '../../fixtures/constants';
import { cleanAlertsData, ingestAlertsData } from '../../fixtures/synthtrace/alerts_data';

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
        hostNames: HOSTS.map(({ hostName }) => hostName),
        preferredSchema: 'ecs',
      });
      await expect(hostsPage.tableLoaded).toBeVisible();
      await expect(hostsPage.getHostRow(HOST1_NAME)).toBeVisible();
    });

    test.afterAll(async ({ esClient, apiServices }) => {
      await cleanAlertsData({ esClient, apiServices });
    });

    test('loads the alerts tab with live alerts', async ({ pageObjects: { hostsPage } }) => {
      await hostsPage.visitAlertsTab();
      await hostsPage.waitForAlertsTableToLoad();
      await expect(hostsPage.getAlertsTable()).toContainText(HOST1_NAME);
    });
  }
);
