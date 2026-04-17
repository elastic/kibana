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
} from '../../fixtures/constants';

test.describe(
  'Hosts Page - Metadata Filter',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects: { hostsPage } }) => {
      await browserAuth.loginAsViewer();
      await hostsPage.goToPage({
        from: DATE_WITH_HOSTS_DATA_FROM,
        to: DATE_WITH_HOSTS_DATA_TO,
      });
    });

    test('Add and remove metadata filter from host flyout', async ({
      pageObjects: { hostsPage, assetDetailsPage, toasts },
    }) => {
      await test.step('open host flyout and navigate to metadata tab', async () => {
        await hostsPage.openHostFlyout(HOST1_NAME);
        await assetDetailsPage.metadataTab.clickTab();
        await expect(assetDetailsPage.metadataTab.tab).toHaveAttribute('aria-selected', 'true');
      });

      await test.step('search for the metadata field and verify filter button is visible', async () => {
        await assetDetailsPage.metadataTab.filterField(HOSTS_METADATA_FIELD);
        await expect(assetDetailsPage.metadataTab.tableRows).toHaveCount(1);

        const { addFilter } =
          assetDetailsPage.metadataTab.getFilterButtonsForField(HOSTS_METADATA_FIELD);
        await expect(addFilter).toBeVisible();
      });

      await test.step('add filter and verify it was applied', async () => {
        await assetDetailsPage.metadataTab.addFilter(HOSTS_METADATA_FIELD);

        await toasts.waitFor();
        const toastHeader = await toasts.getHeaderText();
        expect(toastHeader).toContain('Filter was added');
        await toasts.closeAll();

        const { removeFilter } =
          assetDetailsPage.metadataTab.getFilterButtonsForField(HOSTS_METADATA_FIELD);
        await expect(removeFilter).toBeVisible();
      });

      await test.step('remove filter and verify it was removed', async () => {
        await assetDetailsPage.metadataTab.removeFilter(HOSTS_METADATA_FIELD);

        const { addFilter } =
          assetDetailsPage.metadataTab.getFilterButtonsForField(HOSTS_METADATA_FIELD);
        await expect(addFilter).toBeVisible();
      });
    });

    test('Adding a metadata filter hides other hosts from the table', async ({
      pageObjects: { hostsPage, assetDetailsPage, toasts },
    }) => {
      await test.step('verify all hosts are visible before filtering', async () => {
        await expect(hostsPage.tableRows).toHaveCount(HOSTS.length);
      });

      await test.step('open host flyout, add a filter for host.name', async () => {
        await hostsPage.openHostFlyout(HOST1_NAME);
        await assetDetailsPage.metadataTab.clickTab();
        await assetDetailsPage.metadataTab.filterField(HOSTS_METADATA_FIELD);
        await assetDetailsPage.metadataTab.addFilter(HOSTS_METADATA_FIELD);

        await toasts.waitFor();
        await toasts.closeAll();
      });

      await test.step('close the flyout and verify only the filtered host is visible', async () => {
        await hostsPage.closeFlyout();

        await expect(hostsPage.tableRows).toHaveCount(1);
        await expect(hostsPage.tableRows).toContainText(HOST1_NAME);
      });
    });
  }
);
