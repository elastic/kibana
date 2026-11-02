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
  HOSTS,
  HOST1_NAME,
  DATE_WITH_HOSTS_DATA_FROM,
  DATE_WITH_HOSTS_DATA_TO,
  EXTENDED_TIMEOUT,
} from '../../fixtures/constants';

test.describe(
  'Hosts Page - Content',
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
    });

    test('should maintain the selected date range when navigating to host details', async ({
      pageObjects: { hostsPage },
      page,
    }) => {
      await test.step('click a host link to navigate to host details', async () => {
        await hostsPage.getHostRow(HOST1_NAME).getByTestId('hostsViewTableEntryTitleLink').click();
      });

      await test.step('verify the date picker preserves the selected time range', async () => {
        const datePicker = page.getByTestId('superDatePickerstartDatePopoverButton');
        await expect(datePicker).toBeVisible({ timeout: EXTENDED_TIMEOUT });
        await expect(datePicker).toContainText('Mar 28, 2024');
      });
    });

    test('should load the Logs tab with embedded saved search', async ({
      pageObjects: { hostsPage },
      page,
    }) => {
      await hostsPage.visitLogsTab();
      await expect(page.getByTestId('embeddedSavedSearchDocTable')).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
    });
  }
);
