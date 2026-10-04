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

    test('preserves the selected tab between page reloads', async ({
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

    test('preserves the selected date range across tabs and page reloads', async ({
      pageObjects: { nodeDetailsPage, datePicker },
    }) => {
      // Parse returned date strings in UTC (configured in Playwright config) and compare UTC timestamps
      const expectSelectedDateRange = async () => {
        const timeConfig = await datePicker.getTimeConfig();
        const actualStart = moment.tz(timeConfig.start, DATE_PICKER_FORMAT, true, 'UTC');
        const actualEnd = moment.tz(timeConfig.end, DATE_PICKER_FORMAT, true, 'UTC');
        expect(actualStart.valueOf()).toBe(START_HOST_DATE.valueOf());
        expect(actualEnd.valueOf()).toBe(END_HOST_DATE.valueOf());
      };

      await nodeDetailsPage.clickOverviewTab();

      const tabs = [
        { name: 'metadata', clickFn: 'clickMetadataTab' },
        { name: 'processes', clickFn: 'clickProcessesTab' },
        { name: 'metrics', clickFn: 'clickMetricsTab' },
        { name: 'logs', clickFn: 'clickLogsTab' },
        { name: 'anomalies', clickFn: 'clickAnomaliesTab' },
      ] as const;

      for (const { name, clickFn } of tabs) {
        await test.step(`click ${name} tab and verify date range is preserved`, async () => {
          await nodeDetailsPage[clickFn]();
          await expectSelectedDateRange();
        });
      }

      await test.step('refresh page and verify date range is still preserved', async () => {
        await nodeDetailsPage.refreshPage();
        await expectSelectedDateRange();
      });
    });
  }
);
