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
  HOSTS,
  HOSTS_METADATA_FIELD,
  DATE_WITH_HOSTS_DATA_FROM,
  DATE_WITH_HOSTS_DATA_TO,
  EXTENDED_TIMEOUT,
} from '../../fixtures/constants';

// Failing: See https://github.com/elastic/kibana/issues/258790
test.describe.skip(
  'Hosts Page - Search',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects: { hostsPage } }) => {
      await browserAuth.loginAsViewer();
      await hostsPage.goToPage({
        from: DATE_WITH_HOSTS_DATA_FROM,
        to: DATE_WITH_HOSTS_DATA_TO,
      });
    });

    test('Search using the Hosts page search bar', async ({ pageObjects: { hostsPage } }) => {
      await test.step('verify all hosts are visible before searching', async () => {
        await expect(hostsPage.tableRows).toHaveCount(HOSTS.length);
      });

      await test.step('search for a specific host', async () => {
        await hostsPage.filterByQueryBar(`host.name: "${HOST1_NAME}"`);
      });

      await test.step('verify only the searched host is visible', async () => {
        await expect(hostsPage.tableRows).toHaveCount(1);
        await expect(hostsPage.tableRows).toContainText(HOST1_NAME);
      });
    });

    test('Search using the flyout search bar', async ({
      pageObjects: { hostsPage, assetDetailsPage },
    }) => {
      await test.step('open host flyout and navigate to metadata tab', async () => {
        await hostsPage.openHostFlyout(HOST1_NAME);
        await assetDetailsPage.metadataTab.clickTab();
        await expect(assetDetailsPage.metadataTab.tab).toHaveAttribute('aria-selected', 'true');
      });

      await test.step('search for a metadata field using the flyout search bar', async () => {
        await assetDetailsPage.metadataTab.filterField(HOSTS_METADATA_FIELD);
        await expect(assetDetailsPage.metadataTab.tableRows).toHaveCount(1);
        await expect(assetDetailsPage.metadataTab.tableRows).toContainText(HOSTS_METADATA_FIELD);
      });

      await test.step('clear the search and verify all fields are visible', async () => {
        await assetDetailsPage.metadataTab.searchBar.clear();
        await expect(assetDetailsPage.metadataTab.tableRows).not.toHaveCount(1);
      });
    });

    test('Filter hosts using the Cloud Provider control', async ({
      pageObjects: { hostsPage },
      page,
    }) => {
      await test.step('verify all hosts are visible before filtering', async () => {
        await expect(hostsPage.tableRows).toHaveCount(HOSTS.length);
        await expect(
          page
            .getByTestId('infraAssetDetailsKPIcpuUsage')
            .getByRole('progressbar', { name: 'Loading' })
        ).toBeHidden({ timeout: EXTENDED_TIMEOUT });
      });

      await test.step('select a cloud provider option (include mode)', async () => {
        await hostsPage.openFilterControl('cloud.provider');
        await hostsPage.enableExcludeMode();
        await hostsPage.selectFilterOption('gcp');
      });

      await test.step('verify only hosts with selected cloud provider are visible', async () => {
        const filteredCount = await hostsPage.tableRows.count();
        expect(filteredCount).toBeLessThan(HOSTS.length);
      });

      await test.step('clear the filter and verify all hosts are visible again', async () => {
        await hostsPage.selectFilterOption('gcp');
        await expect(hostsPage.tableRows).toHaveCount(HOSTS.length);
      });
    });

    test('Filter hosts using the Operating System control', async ({
      pageObjects: { hostsPage },
      page,
    }) => {
      await test.step('verify all hosts are visible before filtering', async () => {
        await expect(hostsPage.tableRows).toHaveCount(HOSTS.length);
        await expect(
          page
            .getByTestId('infraAssetDetailsKPIcpuUsage')
            .getByRole('progressbar', { name: 'Loading' })
        ).toBeHidden({ timeout: EXTENDED_TIMEOUT });
      });

      await test.step('open the Operating System filter control', async () => {
        await hostsPage.openFilterControl('host.os.name');
        await hostsPage.enableExcludeMode();
      });

      await test.step('select an operating system option (include mode)', async () => {
        await hostsPage.selectFilterOption('Linux');
      });

      await test.step('verify only hosts with selected operating system are visible', async () => {
        const filteredCount = await hostsPage.tableRows.count();
        expect(filteredCount).toBeLessThanOrEqual(HOSTS.length);
      });

      await test.step('clear the filter and verify all hosts are visible again', async () => {
        await hostsPage.selectFilterOption('Linux');
        await expect(hostsPage.tableRows).toHaveCount(HOSTS.length);
      });
    });
  }
);
