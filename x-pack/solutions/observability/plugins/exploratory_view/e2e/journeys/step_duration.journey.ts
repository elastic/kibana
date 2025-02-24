/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step } from '@elastic/synthetics';
import { recordVideo } from '@kbn/observability-synthetics-test-data';
import moment from 'moment';
import { createExploratoryViewUrl } from '../../public/components/shared/exploratory_view/configurations/exploratory_view_url';
import { loginToKibana, TIMEOUT_60_SEC, waitForLoadingToFinish } from '../utils';

journey('Step Duration series', async ({ page, params }) => {
  recordVideo(page);

  page.setDefaultTimeout(TIMEOUT_60_SEC.timeout);

  const expUrl = createExploratoryViewUrl({
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
          'url.full': ['ALL_VALUES'],
        },
      },
    ],
  });

  const baseUrl = `${params.kibanaUrl}${expUrl}`;

  step('Go to Exploratory view', async () => {
    await page.goto(baseUrl, {
      waitUntil: 'networkidle',
    });
    await loginToKibana({
      page,
      user: { username: 'elastic', password: 'changeme' },
    });
  });

  step('build series with monitor duration', async () => {
    await page.waitForNavigation(TIMEOUT_60_SEC);

    await waitForLoadingToFinish({ page });
    await page.click('text=browser');
    await page.click('text=http');
    await page.click('[aria-label="Remove report metric"]');
    await page.click('button:has-text("Select report metric")');
    await page.click('button:has-text("Step duration")');
    await page.waitForSelector('[data-test-subj=seriesBreakdown]');
    await page.getByTestId('seriesBreakdown').click();
    await page.click('button[role="option"]:has-text("Step name")');
    await page.click('.euiComboBox__inputWrap');
    await page.click('[role="combobox"][placeholder="Search Monitor name"]');
    await page.click('button[role="option"]:has-text("test-monitor - inline")');
    await page.click('button:has-text("Apply changes")');
  });

  step('Verify that changes are applied', async () => {
    await waitForLoadingToFinish({ page });
    await page.click('svg[aria-label="series color: #16c5c0"]');
    await page.click('svg[aria-label="series color: #a6edea"]');
    await page.click('svg[aria-label="series color: #61a2ff"]');
    await page.click('svg[aria-label="series color: #bfdbff"]');
    await page.click('svg[aria-label="series color: #ee72a6"]');
    await page.click('svg[aria-label="series color: #ffc7db"]');
    await page.click('text=load homepage');
    await page.click('text=load homepage');
    await page.click('text=load github');
    await page.click('text=load github');
    await page.click('text=load google');
    await page.click('text=load google');
    await page.click('text=hover over products menu');
    await page.click('text=hover over products menu');
    await page.click('text=load homepage 1');
    await page.click('text=load homepage 1');
    await page.click('text=load homepage 2');
    await page.click('text=load homepage 2');
  });
});
