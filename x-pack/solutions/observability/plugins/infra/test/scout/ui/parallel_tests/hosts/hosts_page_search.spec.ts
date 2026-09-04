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
  HOSTS,
  DATE_WITH_HOSTS_DATA_FROM,
  DATE_WITH_HOSTS_DATA_TO,
} from '../../fixtures/constants';

test.describe(
  'Hosts Page - Search Controls',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
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
      await expect(hostsPage.getHostRow(HOST2_NAME)).toBeVisible();
    });

    test('filters the table when a KQL query is submitted', async ({
      pageObjects: { hostsPage },
    }) => {
      await test.step('submit a query for a single known host', async () => {
        await hostsPage.submitQuery(`host.name : ${JSON.stringify(HOST1_NAME)}`);
      });

      await test.step('verify only that host remains', async () => {
        await expect(hostsPage.getHostRow(HOST1_NAME)).toBeVisible();
        await expect(hostsPage.getHostRow(HOST2_NAME)).toBeHidden();
      });
    });

    test('filters the table by excluding a cloud provider', async ({
      pageObjects: { hostsPage },
    }) => {
      await test.step('exclude gcp hosts from the cloud provider control', async () => {
        await hostsPage.openFilterControl('cloud.provider');
        await hostsPage.enableExcludeMode();
        await hostsPage.selectFilterOption('gcp');
      });

      await test.step('verify known hosts are hidden', async () => {
        await expect(hostsPage.getHostRow(HOST1_NAME)).toBeHidden();
        await expect(hostsPage.getHostRow(HOST2_NAME)).toBeHidden();
      });

      await test.step('clear the cloud provider filter and restore hosts', async () => {
        await hostsPage.closeFilterControl();
        await hostsPage.openFilterControl('cloud.provider');
        await hostsPage.selectFilterOption('gcp');
        await expect(hostsPage.getHostRow(HOST1_NAME)).toBeVisible();
        await expect(hostsPage.getHostRow(HOST2_NAME)).toBeVisible();
      });
    });

    test('filters the table by excluding an operating system', async ({
      pageObjects: { hostsPage },
    }) => {
      await test.step('exclude Linux hosts from the operating system control', async () => {
        await hostsPage.openFilterControl('host.os.name');
        await hostsPage.enableExcludeMode();
        await hostsPage.selectFilterOption('Linux');
      });

      await test.step('verify known hosts are hidden', async () => {
        await expect(hostsPage.getHostRow(HOST1_NAME)).toBeHidden();
        await expect(hostsPage.getHostRow(HOST2_NAME)).toBeHidden();
      });

      await test.step('clear the operating system filter and restore hosts', async () => {
        await hostsPage.closeFilterControl();
        await hostsPage.openFilterControl('host.os.name');
        await hostsPage.selectFilterOption('Linux');
        await expect(hostsPage.getHostRow(HOST1_NAME)).toBeVisible();
        await expect(hostsPage.getHostRow(HOST2_NAME)).toBeVisible();
      });
    });
  }
);
