/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';

// Stateful only: Universal Profiling is not supported on serverless (its setup, status and
// storage explorer routes are not registered there). Serverless will get profiling through
// OTel profiling data instead, which needs its own tests. See
// https://github.com/elastic/kibana/issues/297749
test.describe('Flamegraph page', { tag: tags.stateful.classic }, () => {
  const { rangeFrom, rangeTo } = testData.PROFILING_TEST_DATES;

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('opens flamegraph page and shows chart when WebGL is available', async ({
    pageObjects: { flamegraphPage },
  }) => {
    await flamegraphPage.gotoWithTimeRange(rangeFrom, rangeTo);

    // When WebGL is available, the chart should be visible and warning should not be shown
    const chart = await flamegraphPage.getFlamegraphChart();
    const warning = await flamegraphPage.getWebGLWarning();

    await expect(chart).toBeVisible();
    await expect(warning).toBeHidden();
  });

  test('displays WebGL warning when WebGL is not available', async ({
    pageObjects: { flamegraphPage },
  }) => {
    await flamegraphPage.disableWebGL();
    await flamegraphPage.gotoWithTimeRange(rangeFrom, rangeTo);

    // Verify the WebGL warning is displayed
    const warning = await flamegraphPage.getWebGLWarning();
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('WebGL is required to display the flamegraph');
  });
});
