/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { HOST1_NAME, HOSTS, EXTENDED_TIMEOUT } from '../../fixtures/constants';
import {
  cleanHostsFlyoutSynthtraceData,
  cleanNonTsdsSystemTemplate,
  ensureNonTsdsSystemTemplate,
  ingestHostsFlyoutSynthtraceData,
} from '../../fixtures/sequential_hosts_synthtrace';

const HOSTS_FLYOUT_DATA_FROM = '2024-04-04T18:20:00.000Z';
const HOSTS_FLYOUT_DATA_TO = '2024-04-04T18:21:00.000Z';

test.describe(
  'Hosts Page - Flyout',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ esClient, kbnUrl, log, config, kbnClient }) => {
      log.info('Sequential suite: installing non-TSDS shadow template for metrics-system.*');
      await ensureNonTsdsSystemTemplate(esClient, log);

      log.info('Sequential suite: resetting existing synthtrace data before ingest');
      await cleanHostsFlyoutSynthtraceData({ esClient, kbnUrl, log, config });

      log.info('Sequential suite: ingesting ECS hosts + logs + APM services for flyout tests');
      await ingestHostsFlyoutSynthtraceData(
        { esClient, kbnUrl, log, config },
        { from: HOSTS_FLYOUT_DATA_FROM, to: HOSTS_FLYOUT_DATA_TO }
      );

      log.info('Sequential suite: waiting for hosts metrics to be searchable before navigating');
      await expect
        .poll(
          async () => {
            try {
              const { data } = await kbnClient.request<{ nodes: Array<{ name: string }> }>({
                method: 'POST',
                path: '/api/metrics/infra/host',
                body: {
                  from: HOSTS_FLYOUT_DATA_FROM,
                  to: HOSTS_FLYOUT_DATA_TO,
                  metrics: ['cpuV2', 'diskSpaceUsage', 'memory', 'memoryFree', 'normalizedLoad1m'],
                  limit: 100,
                  schema: 'ecs',
                },
              });
              return data.nodes.length;
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              log.debug(`Hosts metrics readiness probe failed, retrying: ${message}`);
              return 0;
            }
          },
          { timeout: EXTENDED_TIMEOUT, intervals: [1_000, 2_000, 5_000] }
        )
        .toBeGreaterThanOrEqual(HOSTS.length);
    });

    test.beforeEach(async ({ browserAuth, pageObjects: { hostsPage } }) => {
      test.setTimeout(120_000);
      await browserAuth.loginAsViewer();
      await hostsPage.goToPage({
        from: HOSTS_FLYOUT_DATA_FROM,
        to: HOSTS_FLYOUT_DATA_TO,
        hostNames: HOSTS.map(({ hostName }) => hostName),
        preferredSchema: 'ecs',
      });
      await expect(hostsPage.getHostRow(HOST1_NAME)).toBeVisible();
    });

    test.afterAll(async ({ esClient, kbnUrl, log, config }) => {
      log.info('Sequential suite: cleaning synthtrace data for flyout tests');
      await cleanHostsFlyoutSynthtraceData({ esClient, kbnUrl, log, config });
      log.info('Sequential suite: removing non-TSDS shadow template for metrics-system.*');
      await cleanNonTsdsSystemTemplate(esClient, log);
    });

    test('opens the host flyout with overview KPIs', async ({
      pageObjects: { hostsPage, assetDetailsPage },
    }) => {
      await hostsPage.openHostFlyout(HOST1_NAME);

      await expect(assetDetailsPage.hostOverviewTab.kpiGrid).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
      await expect(
        assetDetailsPage.hostOverviewTab.getKPIEmbeddableError('cpuUsage')
      ).not.toBeVisible();
    });

    test('Open as page and return', async ({
      pageObjects: { hostsPage, assetDetailsPage },
      page,
    }) => {
      await hostsPage.openHostFlyout(HOST1_NAME);

      await test.step('click open as page', async () => {
        await assetDetailsPage.openAsPageButton.click();
        const url = new URL(page.url());
        expect(url.pathname).toBe(`/app/metrics/detail/host/${encodeURIComponent(HOST1_NAME)}`);
      });

      await test.step('verify date range is preserved', async () => {
        const datePicker = page.getByTestId('superDatePickerstartDatePopoverButton');
        await expect(datePicker).toBeVisible({ timeout: EXTENDED_TIMEOUT });
        await expect(datePicker).toContainText('Apr 4, 2024');
      });

      await test.step('return to hosts view', async () => {
        await expect(assetDetailsPage.returnButton).toBeVisible({ timeout: EXTENDED_TIMEOUT });
        await assetDetailsPage.returnButton.click();
        await expect(
          page.getByRole('dialog').getByRole('heading', { name: HOST1_NAME })
        ).toBeVisible();
      });
    });
  }
);
