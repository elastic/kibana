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
  KPI_RENDER_TIMEOUT,
} from '../../fixtures/constants';

const FILTERED_HOSTS = [HOST1_NAME, HOST2_NAME, HOST3_NAME];
const FILTER_QUERY = FILTERED_HOSTS.map((name) => `host.name :"${name}"`).join(' or ');

test.describe(
  'Hosts Page - Search Query',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
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
      await hostsPage.waitForKPILoadingToFinish(EXTENDED_TIMEOUT);
    });

    test('should filter the table content on a KQL search submit', async ({
      pageObjects: { hostsPage },
    }) => {
      await test.step('submit a KQL query filtering to 3 hosts', async () => {
        await hostsPage.submitQuery(FILTER_QUERY);
      });

      await test.step('verify only the filtered hosts appear in the table', async () => {
        await expect(hostsPage.tableRows).toHaveCount(FILTERED_HOSTS.length, {
          timeout: EXTENDED_TIMEOUT,
        });
        for (const hostName of FILTERED_HOSTS) {
          await expect(hostsPage.getHostRow(hostName)).toBeVisible();
        }
      });

      await test.step('verify table row metrics have values', async () => {
        const row = hostsPage.getHostRow(HOST1_NAME);
        const locators = hostsPage.getRowDataLocators(row);
        await expect(locators.cpuUsage).not.toHaveText('');
        await expect(locators.normalizedLoad).not.toHaveText('');
        await expect(locators.memoryUsage).not.toHaveText('');
        await expect(locators.memoryFree).not.toHaveText('');
        await expect(locators.diskSpaceUsage).not.toHaveText('');
      });
    });

    test('should update the KPI tiles on a search submit', async ({
      pageObjects: { hostsPage },
    }) => {
      await test.step('submit a KQL query filtering to 3 hosts', async () => {
        await hostsPage.submitQuery(FILTER_QUERY);
      });

      await test.step('verify KPI tiles display values', async () => {
        const kpiTiles = ['cpuUsage', 'normalizedLoad1m', 'memoryUsage', 'diskUsage'];
        await hostsPage.waitForHostKPIChartsToLoad(kpiTiles, KPI_RENDER_TIMEOUT);

        for (const metric of kpiTiles) {
          await expect(hostsPage.getHostKPIChartValueLocator(metric)).toHaveAttribute(
            'title',
            /.+/
          );
        }
      });

      await test.step('verify host count KPI matches filtered count', async () => {
        await expect(hostsPage.getKPITileValueLocator('hostsCount')).toHaveText(
          String(FILTERED_HOSTS.length),
          { timeout: EXTENDED_TIMEOUT }
        );
      });
    });

    test('should show an error callout when an invalid KQL query is submitted', async ({
      pageObjects: { hostsPage },
    }) => {
      await hostsPage.submitQuery('cloud.provider="gcp" A');
      await expect(hostsPage.errorCallout).toBeVisible({ timeout: EXTENDED_TIMEOUT });
    });

    test('should show no data message when query matches no hosts', async ({
      pageObjects: { hostsPage },
    }) => {
      await hostsPage.submitQuery('host.name : "nonexistent-host"');
      await expect(hostsPage.tableNoData).toBeVisible({ timeout: EXTENDED_TIMEOUT });
    });
  }
);
