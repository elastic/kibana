/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SynthtraceFixture, expect, test } from '@kbn/scout';
import { apm, log, timerange } from '@kbn/apm-synthtrace-client';

const TEST_START_TIME = '2024-01-01T00:00:00.000Z';
const TEST_END_TIME = '2024-01-01T01:00:00.000Z';

test.describe('Observability Landing Page', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(
    async ({ browserAuth, kbnClient, apmSynthtraceEsClient, logsSynthtraceEsClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
      await browserAuth.loginAsAdmin();
      await apmSynthtraceEsClient.clean();
      await logsSynthtraceEsClient.clean();
    }
  );

  test.afterAll(async ({ logsSynthtraceEsClient, apmSynthtraceEsClient }) => {
    await apmSynthtraceEsClient.clean();
    await logsSynthtraceEsClient.clean();
  });

  test('redirects to Discover logs when logs data exists', async ({
    page,
    pageObjects,
    logsSynthtraceEsClient,
  }) => {
    // Generate logs data only
    await generateLogsData(logsSynthtraceEsClient);

    // Navigate to observability landing page
    await pageObjects.observability.gotoLanding();

    // Wait for redirect and verify we're on Discover logs page
    await expect(page).toHaveURL(/\/app\/discover/, { timeout: 10000 });
  });

  test('redirects to APM services when only APM data exists', async ({
    page,
    pageObjects,
    apmSynthtraceEsClient,
  }) => {
    // Generate APM data only
    await generateApmData(apmSynthtraceEsClient);

    // Navigate to observability landing page
    await pageObjects.observability.gotoLanding();

    // Wait for redirect and verify we're on APM page
    await expect(page).toHaveURL(/\/app\/apm/, { timeout: 10000 });
  });

  test('redirects to Discover logs when both logs and APM data exist (logs priority)', async ({
    page,
    pageObjects,
    logsSynthtraceEsClient,
    apmSynthtraceEsClient,
  }) => {
    // Generate both logs and APM data
    await generateLogsData(logsSynthtraceEsClient);
    await generateApmData(apmSynthtraceEsClient);

    // Navigate to observability landing page
    await pageObjects.observability.gotoLanding();

    // Wait for redirect and verify we're on Discover logs page (logs takes priority)
    await expect(page).toHaveURL(/\/app\/discover/, { timeout: 10000 });
  });

  test('redirects to onboarding when no data exists', async ({ page, pageObjects }) => {
    // Navigate to observability landing page with no data
    await pageObjects.observability.gotoLanding();

    // Wait for redirect and verify we're on onboarding page
    await expect(page).toHaveURL(/\/app\/observabilityOnboarding/, { timeout: 10000 });
  });
});

/**
 * Generate synthetic logs data for testing
 */
async function generateLogsData(
  logsSynthtraceEsClient: SynthtraceFixture['logsSynthtraceEsClient']
) {
  const logsData = timerange(TEST_START_TIME, TEST_END_TIME)
    .interval('1m')
    .rate(10)
    .generator((timestamp) =>
      log
        .create()
        .message('Test log message')
        .timestamp(timestamp)
        .dataset('synth.test')
        .namespace('default')
        .logLevel(Math.random() > 0.5 ? 'info' : 'warn')
        .defaults({
          'service.name': 'test-service',
        })
    );

  await logsSynthtraceEsClient.index(logsData);
}

/**
 * Generate synthetic APM data for testing
 */
async function generateApmData(apmSynthtraceEsClient: SynthtraceFixture['apmSynthtraceEsClient']) {
  const serviceNames = ['test-service-1', 'test-service-2'];

  const apmData = timerange(TEST_START_TIME, TEST_END_TIME)
    .interval('1m')
    .rate(10)
    .generator((timestamp) =>
      serviceNames.flatMap((serviceName) =>
        apm
          .service({ name: serviceName, environment: 'test', agentName: 'nodejs' })
          .instance('instance-1')
          .transaction({ transactionName: 'GET /api/test' })
          .timestamp(timestamp)
          .duration(100)
          .success()
      )
    );

  await apmSynthtraceEsClient.index(apmData);
}
