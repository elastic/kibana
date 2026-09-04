/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { SEMCONV_HOSTS, SEMCONV_HOST1_NAME, EXTENDED_TIMEOUT } from '../../fixtures/constants';
import {
  cleanSemconvHostsSynthtraceData,
  ingestSemconvHostsSynthtraceData,
} from '../../fixtures/sequential_hosts_synthtrace';

const SEMCONV_HOSTS_DATA_FROM = '2024-04-06T18:20:00.000Z';
const SEMCONV_HOSTS_DATA_TO = '2024-04-06T18:21:00.000Z';

test.describe(
  'Hosts Page - OTel Semconv Data',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ esClient, kbnUrl, log, config }) => {
      log.info('Sequential suite: ingesting semconv host metrics');
      await ingestSemconvHostsSynthtraceData(
        { esClient, kbnUrl, log, config },
        { from: SEMCONV_HOSTS_DATA_FROM, to: SEMCONV_HOSTS_DATA_TO }
      );
    });

    test.beforeEach(async ({ browserAuth, pageObjects: { hostsPage } }) => {
      test.setTimeout(120_000);
      await browserAuth.loginAsViewer();
      await hostsPage.goToPage({
        from: SEMCONV_HOSTS_DATA_FROM,
        to: SEMCONV_HOSTS_DATA_TO,
        hostNames: SEMCONV_HOSTS.map(({ hostName }) => hostName),
        preferredSchema: 'semconv',
      });
      await expect(hostsPage.getHostRow(SEMCONV_HOST1_NAME)).toBeVisible();
    });

    test.afterAll(async ({ esClient, kbnUrl, log, config }) => {
      log.info('Sequential suite: cleaning semconv host metrics');
      await cleanSemconvHostsSynthtraceData({ esClient, kbnUrl, log, config });
    });

    test('lists semconv hosts and opens the flyout', async ({
      pageObjects: { hostsPage, assetDetailsPage },
    }) => {
      await test.step('verify semconv hosts are listed by name', async () => {
        for (const host of SEMCONV_HOSTS) {
          await expect(hostsPage.getHostRow(host.hostName)).toBeVisible();
        }
      });

      await test.step('open flyout for a semconv host', async () => {
        await hostsPage.openHostFlyout(SEMCONV_HOST1_NAME);
        await expect(assetDetailsPage.hostOverviewTab.kpiGrid).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
        await expect(
          assetDetailsPage.hostOverviewTab.getKPIEmbeddableError('cpuUsage')
        ).not.toBeVisible();
      });
    });
  }
);
