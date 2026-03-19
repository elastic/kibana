/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/no-nth-methods */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import moment from 'moment';
import { createExploratoryViewUrl } from '../../../../public/components/shared/exploratory_view/configurations/exploratory_view_url';
import { test } from '../fixtures';

test.describe('Step Duration series', { tag: tags.stateful.classic }, () => {
  test('builds series with step duration metric', async ({ pageObjects, page, browserAuth }) => {
    await test.step('Go to Exploratory view', async () => {
      await browserAuth.loginAsAdmin();

      const testUrl = createExploratoryViewUrl({
        reportType: 'kpi-over-time',
        allSeries: [
          {
            dataType: 'uptime',
            time: {
              from: moment().subtract(10, 'y').toISOString(),
              to: moment().toISOString(),
            },
            name: 'synthetics-series-1',
            breakdown: 'monitor.type',
            selectedMetricField: 'monitor.duration.us',
            reportDefinitions: {
              'monitor.name': ['test-monitor - inline'],
              'url.full': ['ALL_VALUES'],
            },
          },
        ],
      });

      await pageObjects.exploratoryView.goto(testUrl);
      await pageObjects.exploratoryView.waitForLoadingToFinish();
    });

    await test.step('build series with monitor duration', async () => {
      const legendItems = pageObjects.exploratoryView.echLegendItemLocator;
      await expect(legendItems).toHaveCount(1);
      await expect(legendItems.nth(0)).toHaveText('browser');

      await pageObjects.exploratoryView.changeReportMetric('Step duration');
      await pageObjects.exploratoryView.selectSeriesBreakdown('Step name');

      await pageObjects.exploratoryView.applySeriesChanges();
      await pageObjects.exploratoryView.waitForLoadingToFinish();
    });

    await test.step('Verify that changes are applied', async () => {
      const legendItems = pageObjects.exploratoryView.echLegendItemLocator;
      await expect(legendItems).toHaveCount(6);
      await expect(legendItems.nth(0)).toHaveText('load homepage');
      await expect(legendItems.nth(1)).toHaveText('load github');
      await expect(legendItems.nth(2)).toHaveText('load google');
      await expect(legendItems.nth(3)).toHaveText('hover over products menu');
      await expect(legendItems.nth(4)).toHaveText('load homepage 1');
      await expect(legendItems.nth(5)).toHaveText('load homepage 2');
    });

    await test.step('Hide series', async () => {
      const legendItems = pageObjects.exploratoryView.echLegendItemLocator;
      await expect(legendItems).toHaveCount(6);
      await legendItems.nth(0).click();
      await expect(page.locator('[title="series hidden"]')).toHaveCount(5);
      await legendItems.nth(1).click();
      await expect(page.locator('[title="series hidden"]')).toHaveCount(4);
    });
  });
});
