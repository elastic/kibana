/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import {
  generateApmData,
  generateLogsData,
  TEST_START_DATE,
  TEST_END_DATE,
} from '../fixtures/generators';
import { BIGGER_TIMEOUT } from '../fixtures/constants';

test.describe('Observability Landing Page', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, apmSynthtraceEsClient, logsSynthtraceEsClient }) => {
    await browserAuth.loginAsAdmin();
    await apmSynthtraceEsClient.clean();
    await logsSynthtraceEsClient.clean();
  });

  test.afterAll(async ({ apmSynthtraceEsClient, logsSynthtraceEsClient }) => {
    await apmSynthtraceEsClient.clean();
    await logsSynthtraceEsClient.clean();
  });

  test('redirects to page specified in defaultRoute uiSetting', async ({
    page,
    kbnClient,
    kbnUrl,
  }) => {
    // Set custom default route
    const prevDefaultRoute = await kbnClient.uiSettings.get('defaultRoute');
    await kbnClient.uiSettings.update({
      defaultRoute: '/app/metrics',
    });

    // Navigate to observability landing page
    await page.goto(kbnUrl.get('/'));

    // Wait for redirect and verify we're on the metrics page
    await expect(page).toHaveURL(/\/app\/metrics/, { timeout: BIGGER_TIMEOUT });

    // Restore default route
    await kbnClient.uiSettings.update({
      defaultRoute: prevDefaultRoute,
    });
  });

  test('redirects to Discover logs when logs data exists', async ({
    page,
    pageObjects,
    logsSynthtraceEsClient,
  }) => {
    // Generate logs data only
    await generateLogsData({
      from: new Date(TEST_START_DATE).getTime(),
      to: new Date(TEST_END_DATE).getTime(),
      client: logsSynthtraceEsClient,
    });

    // Navigate to observability landing page
    await pageObjects.observabilityNavigation.gotoLanding();

    // Wait for redirect and verify we're on Discover logs page
    await expect(page).toHaveURL(/\/app\/discover/, { timeout: BIGGER_TIMEOUT });
  });

  test('redirects to APM services when only APM data exists', async ({
    page,
    pageObjects,
    apmSynthtraceEsClient,
  }) => {
    // Generate APM data only
    await generateApmData({
      from: new Date(TEST_START_DATE).getTime(),
      to: new Date(TEST_END_DATE).getTime(),
      client: apmSynthtraceEsClient,
    });

    // Navigate to observability landing page
    await pageObjects.observabilityNavigation.gotoLanding();

    // Wait for redirect and verify we're on APM page
    await expect(page).toHaveURL(/\/app\/apm/, { timeout: BIGGER_TIMEOUT });
  });

  test('redirects to Discover logs when both logs and APM data exist (logs priority)', async ({
    page,
    pageObjects,
    logsSynthtraceEsClient,
    apmSynthtraceEsClient,
  }) => {
    // Generate both logs and APM data
    await generateLogsData({
      from: new Date(TEST_START_DATE).getTime(),
      to: new Date(TEST_END_DATE).getTime(),
      client: logsSynthtraceEsClient,
    });

    await generateApmData({
      from: new Date(TEST_START_DATE).getTime(),
      to: new Date(TEST_END_DATE).getTime(),
      client: apmSynthtraceEsClient,
    });

    // Navigate to observability landing page
    await pageObjects.observabilityNavigation.gotoLanding();

    // Wait for redirect and verify we're on Discover logs page (logs takes priority)
    await expect(page).toHaveURL(/\/app\/discover/, { timeout: BIGGER_TIMEOUT });
  });

  test('redirects to onboarding when no data exists', async ({ page, pageObjects }) => {
    // Navigate to observability landing page with no data
    await pageObjects.observabilityNavigation.gotoLanding();

    // Wait for redirect and verify we're on onboarding page
    await expect(page).toHaveURL(/\/app\/observabilityOnboarding/, { timeout: BIGGER_TIMEOUT });
  });

  test('redirects to onboarding when log data that should be ignored exists', async ({
    page,
    pageObjects,
    logsSynthtraceEsClient,
  }) => {
    // Generate Fleet Agent status change log data which should be ignored
    await generateLogsData({
      from: new Date(TEST_START_DATE).getTime(),
      to: new Date(TEST_END_DATE).getTime(),
      client: logsSynthtraceEsClient,
      opts: { dataset: 'elastic_agent.status_change' },
    });

    // Navigate to observability landing page with no data
    await pageObjects.observabilityNavigation.gotoLanding();

    // Wait for redirect and verify we're on onboarding page
    await expect(page).toHaveURL(/\/app\/observabilityOnboarding/, { timeout: 10000 });
  });
});
