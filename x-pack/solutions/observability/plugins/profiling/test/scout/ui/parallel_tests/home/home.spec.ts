/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';

test.describe('Home page', { tag: tags.stateful.classic }, () => {
  const { rangeFrom } = testData.PROFILING_TEST_DATES;
  const rangeTo = '2023-04-18T00:05:00.000Z';

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('opens Profiling UI when user has privileges', async ({
    pageObjects: { profilingHomePage },
  }) => {
    await profilingHomePage.gotoWithTimeRange(rangeFrom, rangeTo);
    await profilingHomePage.expectTopNContent();
    // Since we're using loginAsAdmin(), the user has privileges and won't see the limitation message
    // Instead, we should verify the page loads successfully
    await expect(
      profilingHomePage.page.getByTestId('profilingPageTemplate').getByText('Universal Profiling')
    ).toBeVisible();
  });

  test('navigates through the tabs', async ({ pageObjects: { profilingHomePage }, page }) => {
    await profilingHomePage.gotoWithTimeRange(rangeFrom, rangeTo);
    await profilingHomePage.expectUrlToInclude('/app/profiling/stacktraces/threads');

    await profilingHomePage.clickTab('Traces');
    await profilingHomePage.expectUrlToInclude('/app/profiling/stacktraces/traces');
    expect(page.url()).toContain('/app/profiling/stacktraces/traces');

    await profilingHomePage.clickTab('Hosts');
    await profilingHomePage.expectUrlToInclude('/app/profiling/stacktraces/hosts');
    expect(page.url()).toContain('/app/profiling/stacktraces/hosts');

    await profilingHomePage.clickTab('Deployments');
    await profilingHomePage.expectUrlToInclude('/app/profiling/stacktraces/deployments');
    expect(page.url()).toContain('/app/profiling/stacktraces/deployments');

    await profilingHomePage.clickTab('Containers');
    await profilingHomePage.expectUrlToInclude('/app/profiling/stacktraces/containers');
    expect(page.url()).toContain('/app/profiling/stacktraces/containers');
  });
});
