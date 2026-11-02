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
  HOSTS_METADATA_FIELD,
  DATE_WITH_HOSTS_DATA_FROM,
  DATE_WITH_HOSTS_DATA_TO,
} from '../../fixtures/constants';

test.describe(
  'Hosts Page - Table Filters',
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

      await test.step('wait for the hosts table to load', async () => {
        await expect(hostsPage.tableLoaded).toBeVisible();
        await expect(hostsPage.getHostRow(HOST1_NAME)).toBeVisible();
      });
    });

    test('filters the table to selected hosts', async ({ pageObjects: { hostsPage } }) => {
      await test.step('select two hosts via checkboxes', async () => {
        await hostsPage.clickHostCheckbox(HOST1_NAME, 'Linux');
        await hostsPage.clickHostCheckbox(HOST2_NAME, 'Linux');
        await expect(hostsPage.selectedHostsFilterButton).toBeVisible();
      });

      await test.step('apply the filter and verify host identity', async () => {
        await hostsPage.clickSelectedHostsButton();
        await hostsPage.clickAddFilterButton();
        await expect(hostsPage.getHostRow(HOST1_NAME)).toBeVisible();
        await expect(hostsPage.getHostRow(HOST2_NAME)).toBeVisible();
        await expect(hostsPage.getHostRow(HOST3_NAME)).toBeHidden();
      });
    });

    test('adds and removes a flyout metadata filter on the hosts table', async ({
      pageObjects: { hostsPage, assetDetailsPage, toasts },
    }) => {
      await test.step('add the host name filter from metadata', async () => {
        await hostsPage.openHostFlyout(HOST1_NAME);
        await assetDetailsPage.metadataTab.clickTab();
        await assetDetailsPage.metadataTab.filterField(HOSTS_METADATA_FIELD);
        await assetDetailsPage.metadataTab.addFilter(HOSTS_METADATA_FIELD);
        await toasts.waitFor();
        await toasts.closeAll();
      });

      await test.step('verify the table reflects the metadata filter', async () => {
        await hostsPage.closeFlyout();
        await expect(hostsPage.getHostRow(HOST1_NAME)).toBeVisible();
        await expect(hostsPage.getHostRow(HOST2_NAME)).toBeHidden();
      });

      await test.step('remove the metadata filter from the flyout', async () => {
        await hostsPage.openHostFlyout(HOST1_NAME);
        await assetDetailsPage.metadataTab.clickTab();
        await assetDetailsPage.metadataTab.filterField(HOSTS_METADATA_FIELD);
        await assetDetailsPage.metadataTab.removeFilter(HOSTS_METADATA_FIELD);
      });

      await test.step('verify the table restores the other hosts', async () => {
        await hostsPage.closeFlyout();
        await expect(hostsPage.getHostRow(HOST1_NAME)).toBeVisible();
        await expect(hostsPage.getHostRow(HOST2_NAME)).toBeVisible();
      });
    });
  }
);
