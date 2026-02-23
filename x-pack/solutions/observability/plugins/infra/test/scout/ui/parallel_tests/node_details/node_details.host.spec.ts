/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import {
  DATE_WITH_K8S_HOSTS_DATA_FROM,
  DATE_WITH_K8S_HOSTS_DATA_TO,
  K8S_HOST_NAME,
} from '../../fixtures/constants';

const DATE_PICKER_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';

const START_HOST_DATE = moment.utc(DATE_WITH_K8S_HOSTS_DATA_FROM);
const END_HOST_DATE = moment.utc(DATE_WITH_K8S_HOSTS_DATA_TO);

test.describe(
  'Node Details: host',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects: { nodeDetailsPage } }) => {
      await browserAuth.loginAsViewer();
      await nodeDetailsPage.goToPage(K8S_HOST_NAME, 'host', {
        name: K8S_HOST_NAME,
        from: START_HOST_DATE,
        to: END_HOST_DATE,
      });
    });

    test('preserves selected tab between page reloads', async ({
      pageObjects: { nodeDetailsPage },
    }) => {
      await test.step('verify metadata tab is not visible initially', async () => {
        await expect(nodeDetailsPage.metadataTable).toBeHidden();
      });

      await test.step('click metadata tab', async () => {
        await nodeDetailsPage.clickMetadataTab();
        await expect(nodeDetailsPage.metadataTable).toBeVisible();
      });

      await test.step('refresh page and verify metadata tab is still selected', async () => {
        await nodeDetailsPage.refreshPage();
        await expect(nodeDetailsPage.metadataTable).toBeVisible();
      });
    });

    test('Date picker: host - preserves date range across tabs', async ({
      pageObjects: { nodeDetailsPage, datePicker },
    }) => {
      await nodeDetailsPage.goToPage(K8S_HOST_NAME, 'host', {
        name: K8S_HOST_NAME,
        from: START_HOST_DATE,
        to: END_HOST_DATE,
      });
      await nodeDetailsPage.clickOverviewTab();

      const tabs = [
        { name: 'metadata', clickFn: 'clickMetadataTab' },
        { name: 'processes', clickFn: 'clickProcessesTab' },
        { name: 'metrics', clickFn: 'clickMetricsTab' },
        { name: 'logs', clickFn: 'clickLogsTab' },
        { name: 'anomalies', clickFn: 'clickAnomaliesTab' },
      ];

      for (const { name, clickFn } of tabs) {
        await test.step(`click ${name} tab and verify date range is preserved`, async () => {
          await (nodeDetailsPage as any)[clickFn]();
          const timeConfig = await datePicker.getTimeConfig();
          // Parse returned date strings in UTC (configured in Playwright config) and compare UTC timestamps
          const actualStart = moment.tz(timeConfig.start, DATE_PICKER_FORMAT, true, 'UTC');
          const actualEnd = moment.tz(timeConfig.end, DATE_PICKER_FORMAT, true, 'UTC');
          expect(actualStart.valueOf()).toBe(START_HOST_DATE.valueOf());
          expect(actualEnd.valueOf()).toBe(END_HOST_DATE.valueOf());
        });
      }
    });

    test('Date picker: host - preserves selected date range between page reloads', async ({
      pageObjects: { nodeDetailsPage, datePicker },
    }) => {
      await nodeDetailsPage.clickOverviewTab();

      await test.step('refresh page and verify date range is preserved', async () => {
        await nodeDetailsPage.refreshPage();
        const timeConfig = await datePicker.getTimeConfig();
        // Parse returned date strings in UTC (configured in Playwright config) and compare UTC timestamps
        const actualStart = moment.tz(timeConfig.start, DATE_PICKER_FORMAT, true, 'UTC');
        const actualEnd = moment.tz(timeConfig.end, DATE_PICKER_FORMAT, true, 'UTC');
        expect(actualStart.valueOf()).toBe(START_HOST_DATE.valueOf());
        expect(actualEnd.valueOf()).toBe(END_HOST_DATE.valueOf());
      });
    });

    test('Overview Tab - KPI tiles show correct values', async ({
      pageObjects: { nodeDetailsPage },
    }) => {
      await nodeDetailsPage.clickOverviewTab();

      const kpiTiles = [
        { metric: 'cpuUsage', value: '50.0%' },
        { metric: 'normalizedLoad1m', value: '18.8%' },
        { metric: 'memoryUsage', value: '35.0%' },
        { metric: 'diskUsage', value: '1,223.0%' },
      ];

      for (const { metric, value } of kpiTiles) {
        await test.step(`verify ${metric} KPI tile value`, async () => {
          const tileValue = await nodeDetailsPage.getKPITileValue(metric);
          expect(tileValue).toBe(value);
        });
      }
    });

    test('Overview Tab - renders metric charts', async ({
      pageObjects: { assetDetailsPage },
      page,
    }) => {
      await expect(page.getByTestId('superDatePickerToggleQuickMenuButton')).toBeVisible();

      await test.step('wait for charts to load and verify CPU Usage chart', async () => {
        await expect(assetDetailsPage.hostOverviewTab.metricsCpuUsageChart).toBeVisible();
      });

      await test.step('wait for charts to load and verify Normalized Load chart', async () => {
        await expect(assetDetailsPage.hostOverviewTab.metricsCpuNormalizedLoadChart).toBeVisible();
      });

      await test.step('wait for charts to load and verify Memory Usage chart', async () => {
        await expect(assetDetailsPage.hostOverviewTab.metricsMemoryUsageChart).toBeVisible();
      });

      await test.step('wait for charts to load and verify Network chart', async () => {
        await expect(assetDetailsPage.hostOverviewTab.metricsNetworkChart).toBeVisible();
      });

      await test.step('wait for charts to load and verify Disk Usage chart', async () => {
        await expect(assetDetailsPage.hostOverviewTab.metricsDiskUsageChart).toBeVisible();
      });

      await test.step('wait for charts to load and verify Disk IO chart', async () => {
        await expect(assetDetailsPage.hostOverviewTab.metricsDiskIOChart).toBeVisible();
      });
    });

    test('Overview Tab - shows all sections as collapsible', async ({
      pageObjects: { nodeDetailsPage },
    }) => {
      await nodeDetailsPage.clickOverviewTab();
      await test.step('verify collapsible sections exist', async () => {
        await expect(nodeDetailsPage.metadataCollapsible).toBeVisible();
        await expect(nodeDetailsPage.alertsCollapsible).toBeVisible();
        await expect(nodeDetailsPage.metricsCollapsible).toBeVisible();
        await expect(nodeDetailsPage.servicesCollapsible).toBeVisible();
      });
    });

    test('Overview Tab - shows alerts', async ({ pageObjects: { nodeDetailsPage } }) => {
      await nodeDetailsPage.clickOverviewTab();
      await test.step('verify alerts title exists', async () => {
        await expect(nodeDetailsPage.alertsTitle).toBeVisible();
      });
    });

    test('Overview Tab - shows / hides alerts section with no alerts', async ({
      pageObjects: { nodeDetailsPage },
    }) => {
      await nodeDetailsPage.clickOverviewTab();
      await test.step('verify alerts section is collapsible', async () => {
        await expect(nodeDetailsPage.alertsCollapsible).toBeVisible();
      });

      await test.step('verify alerts section closed content with no alerts exists', async () => {
        await expect(
          nodeDetailsPage.page.testSubj.locator('infraAssetDetailsAlertsClosedContentNoAlerts')
        ).toBeVisible();
      });

      await test.step('expand alerts section', async () => {
        await nodeDetailsPage.clickAlertsSectionCollapsible();
        await expect(
          nodeDetailsPage.page.testSubj.locator('infraAssetDetailsAlertsClosedContentNoAlerts')
        ).toBeHidden();
      });
    });

    test('Metadata Tab - shows metadata table', async ({ pageObjects: { nodeDetailsPage } }) => {
      await nodeDetailsPage.clickMetadataTab();

      await test.step('verify metadata table exists', async () => {
        await expect(nodeDetailsPage.metadataTable).toBeVisible();
      });
    });

    test('Metadata Tab - pin and unpin table row', async ({
      pageObjects: { nodeDetailsPage },
      page,
    }) => {
      await nodeDetailsPage.clickMetadataTab();

      await test.step('add pin to metadata field', async () => {
        await page.getByRole('button', { name: 'Pin host.hostname' }).click();
        await expect(nodeDetailsPage.metadataRemovePin).toBeVisible();
      });

      await test.step('refresh page and verify pin persists', async () => {
        await nodeDetailsPage.refreshPage();
        await nodeDetailsPage.clickMetadataTab();
        await expect(nodeDetailsPage.metadataRemovePin).toBeVisible();
      });

      await test.step('remove pin from metadata field', async () => {
        await nodeDetailsPage.unpinMetadataField();
        await expect(nodeDetailsPage.metadataRemovePin).toBeHidden();
      });
    });

    test('Metadata Tab - preserves search term between page reloads', async ({
      pageObjects: { nodeDetailsPage },
      page,
    }) => {
      await nodeDetailsPage.clickMetadataTab();

      await test.step('verify search input is empty initially', async () => {
        const searchValue = await nodeDetailsPage.getMetadataSearchValue();
        expect(searchValue).toBe('');
      });

      await test.step('type search term', async () => {
        await nodeDetailsPage.searchMetadata('test');
        const searchValue = await nodeDetailsPage.getMetadataSearchValue();
        expect(searchValue).toBe('test');
        await expect(page.getByTestId('infraAssetDetailsMetadataNoData')).toBeVisible();
      });

      await test.step('refresh page and verify search term persists', async () => {
        await nodeDetailsPage.refreshPage();
        const searchValue = await nodeDetailsPage.getMetadataSearchValue();
        expect(searchValue).toBe('test');
      });

      await test.step('clear search', async () => {
        await nodeDetailsPage.clearMetadataSearch();
      });
    });

    test('Metrics Tab - renders quick access items', async ({
      pageObjects: { nodeDetailsPage },
    }) => {
      await nodeDetailsPage.clickMetricsTab();

      const metrics = ['cpu', 'memory', 'disk', 'network', 'log'];
      for (const metric of metrics) {
        await test.step(`verify quick access item for ${metric} exists`, async () => {
          await expect(
            nodeDetailsPage.page.testSubj.locator(`infraMetricsQuickAccessItem${metric}`)
          ).toBeVisible();
        });
      }
    });

    test('Legacy alert metric callout - shows for cpu', async ({
      pageObjects: { nodeDetailsPage },
    }) => {
      await test.step('navigate to host with cpu alert metric', async () => {
        await nodeDetailsPage.goToPage(K8S_HOST_NAME, 'host', {
          name: K8S_HOST_NAME,
          alertMetric: 'cpu',
        });
      });

      await test.step('verify legacy metric alert callout exists', async () => {
        const calloutExists = await nodeDetailsPage.legacyMetricAlertCalloutExists();
        expect(calloutExists).toBe(true);
      });
    });

    test('Legacy alert metric callout - shows for rx', async ({
      pageObjects: { nodeDetailsPage },
    }) => {
      await test.step('navigate to host with rx alert metric', async () => {
        await nodeDetailsPage.goToPage(K8S_HOST_NAME, 'host', {
          name: K8S_HOST_NAME,
          alertMetric: 'rx',
        });
      });

      await test.step('verify legacy metric alert callout exists', async () => {
        const calloutExists = await nodeDetailsPage.legacyMetricAlertCalloutExists();
        expect(calloutExists).toBe(true);
      });
    });

    test('Legacy alert metric callout - shows for tx', async ({
      pageObjects: { nodeDetailsPage },
    }) => {
      await test.step('navigate to host with tx alert metric', async () => {
        await nodeDetailsPage.goToPage(K8S_HOST_NAME, 'host', {
          name: K8S_HOST_NAME,
          alertMetric: 'tx',
        });
      });

      await test.step('verify legacy metric alert callout exists', async () => {
        const calloutExists = await nodeDetailsPage.legacyMetricAlertCalloutExists();
        expect(calloutExists).toBe(true);
      });
    });

    test('Legacy alert metric callout - does not show for cpuV2', async ({
      pageObjects: { nodeDetailsPage },
    }) => {
      await test.step('navigate to host with cpuV2 alert metric', async () => {
        await nodeDetailsPage.goToPage(K8S_HOST_NAME, 'host', {
          name: K8S_HOST_NAME,
          alertMetric: 'cpuV2',
        });
      });

      await test.step('verify legacy metric alert callout does not exist', async () => {
        const calloutExists = await nodeDetailsPage.legacyMetricAlertCalloutExists();
        expect(calloutExists).toBe(false);
      });
    });

    test('Legacy alert metric callout - does not show for rxV2', async ({
      pageObjects: { nodeDetailsPage },
    }) => {
      await test.step('navigate to host with rxV2 alert metric', async () => {
        await nodeDetailsPage.goToPage(K8S_HOST_NAME, 'host', {
          name: K8S_HOST_NAME,
          alertMetric: 'rxV2',
        });
      });

      await test.step('verify legacy metric alert callout does not exist', async () => {
        const calloutExists = await nodeDetailsPage.legacyMetricAlertCalloutExists();
        expect(calloutExists).toBe(false);
      });
    });

    test('Legacy alert metric callout - does not show for txV2', async ({
      pageObjects: { nodeDetailsPage },
    }) => {
      await test.step('navigate to host with txV2 alert metric', async () => {
        await nodeDetailsPage.goToPage(K8S_HOST_NAME, 'host', {
          name: K8S_HOST_NAME,
          alertMetric: 'txV2',
        });
      });

      await test.step('verify legacy metric alert callout does not exist', async () => {
        const calloutExists = await nodeDetailsPage.legacyMetricAlertCalloutExists();
        expect(calloutExists).toBe(false);
      });
    });
  }
);
