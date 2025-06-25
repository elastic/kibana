/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, test } from '@kbn/scout';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { ApmSynthtraceEsClient, LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';

const LOGS_INDEX = 'logs-test-default';
const TEST_START_TIME = '2024-01-01T00:00:00.000Z';
const TEST_END_TIME = '2024-01-01T01:00:00.000Z';

test.describe('Observability Landing Page Redirects', { tag: ['@ess', '@svlOblt'] }, () => {
  let apmSynthtraceEsClient: ApmSynthtraceEsClient;

  test.beforeAll(async ({ esClient, synthtrace }) => {
    apmSynthtraceEsClient = synthtrace.apm;

    // Create logs index template
    await esClient.indices.putIndexTemplate({
      name: 'logs-test-template',
      index_patterns: ['logs-test-*'],
      data_stream: {},
      priority: 500,
      template: {
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            message: { type: 'text' },
            'log.level': { type: 'keyword' },
            'service.name': { type: 'keyword' },
          },
        },
      },
    });

    // Create logs data stream
    await esClient.indices.createDataStream({
      name: LOGS_INDEX,
    });
  });

  test.beforeEach(async ({ browserAuth, kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ esClient, synthtrace }) => {
    await synthtrace.apm.clean();
    await esClient.indices.deleteDataStream({ name: LOGS_INDEX, ignore: [404] });
    await esClient.indices.deleteIndexTemplate({
      name: 'logs-test-template',
      ignore: [404],
    });
  });

  test.describe('Complete Landing Page (Full License)', () => {
    test('redirects to Discover logs when logs data exists', async ({ page, esClient }) => {
      // Generate logs data only
      await generateLogsData(esClient);

      // Navigate to observability landing page
      await page.goto('/app/observability');

      // Wait for redirect and verify we're on Discover logs page
      await expect(page).toHaveURL(/\/app\/discover/, { timeout: 10000 });
      await expect(page.locator('[data-test-subj="discoverDocTable"]')).toBeVisible({
        timeout: 15000,
      });
    });

    test('redirects to APM when only APM data exists', async ({ page }) => {
      // Generate APM data only
      await generateApmData(apmSynthtraceEsClient);

      // Navigate to observability landing page
      await page.goto('/app/observability');

      // Wait for redirect and verify we're on APM page
      await expect(page).toHaveURL(/\/app\/apm/, { timeout: 10000 });
      await expect(page.locator('[data-test-subj="apmMainContainer"]')).toBeVisible({
        timeout: 15000,
      });
    });

    test('redirects to Discover logs when both logs and APM data exist (logs priority)', async ({
      page,
      esClient,
    }) => {
      // Generate both logs and APM data
      await generateLogsData(esClient);
      await generateApmData(apmSynthtraceEsClient);

      // Navigate to observability landing page
      await page.goto('/app/observability');

      // Wait for redirect and verify we're on Discover logs page (logs takes priority)
      await expect(page).toHaveURL(/\/app\/discover/, { timeout: 10000 });
      await expect(page.locator('[data-test-subj="discoverDocTable"]')).toBeVisible({
        timeout: 15000,
      });
    });

    test('redirects to onboarding when no data exists', async ({ page }) => {
      // Navigate to observability landing page with no data
      await page.goto('/app/observability');

      // Wait for redirect and verify we're on onboarding page
      await expect(page).toHaveURL(/\/app\/observabilityOnboarding/, { timeout: 10000 });
      await expect(page.locator('[data-test-subj="obltOnboardingHomeTitle"]')).toBeVisible({
        timeout: 15000,
      });
    });
  });

  test.describe('Logs Essentials Landing Page (Basic License)', () => {
    test.beforeEach(async ({ kbnClient }) => {
      // Mock basic license (logs essentials only)
      await kbnClient.request({
        path: '/api/licensing/info',
        method: 'PUT',
        body: {
          license: {
            type: 'basic',
            status: 'active',
          },
        },
      });
    });

    test('redirects to Discover logs when logs data exists', async ({ page, esClient }) => {
      // Generate logs data
      await generateLogsData(esClient);

      // Navigate to observability landing page
      await page.goto('/app/observability');

      // Wait for redirect and verify we're on Discover logs page
      await expect(page).toHaveURL(/\/app\/discover/, { timeout: 10000 });
      await expect(page.locator('[data-test-subj="discoverDocTable"]')).toBeVisible({
        timeout: 15000,
      });
    });

    test('redirects to onboarding when no logs data exists (ignores APM data)', async ({
      page,
    }) => {
      // Generate APM data only (should be ignored in essentials)
      await generateApmData(apmSynthtraceEsClient);

      // Navigate to observability landing page
      await page.goto('/app/observability');

      // Wait for redirect and verify we're on onboarding page (APM data ignored)
      await expect(page).toHaveURL(/\/app\/observabilityOnboarding/, { timeout: 10000 });
      await expect(page.locator('[data-test-subj="obltOnboardingHomeTitle"]')).toBeVisible({
        timeout: 15000,
      });
    });

    test('redirects to onboarding when no data exists', async ({ page }) => {
      // Navigate to observability landing page with no data
      await page.goto('/app/observability');

      // Wait for redirect and verify we're on onboarding page
      await expect(page).toHaveURL(/\/app\/observabilityOnboarding/, { timeout: 10000 });
      await expect(page.locator('[data-test-subj="obltOnboardingHomeTitle"]')).toBeVisible({
        timeout: 15000,
      });
    });
  });

  test.describe('Redirect Performance', () => {
    test('completes redirect within reasonable time', async ({ page, esClient }) => {
      // Generate logs data
      await generateLogsData(esClient);

      // Measure redirect time
      const startTime = Date.now();
      await page.goto('/app/observability');
      await expect(page).toHaveURL(/\/app\/discover/, { timeout: 10000 });
      const redirectTime = Date.now() - startTime;

      // Assert redirect completes within 5 seconds
      expect(redirectTime).toBeLessThan(5000);
    });
  });

  test.describe('URL Validation', () => {
    test('redirect URLs contain expected paths', async ({ page, esClient }) => {
      // Test Discover logs redirect
      await generateLogsData(esClient);
      await page.goto('/app/observability');
      await expect(page).toHaveURL(/\/app\/discover/, { timeout: 10000 });
      expect(page.url()).toContain('/app/discover');

      // Clean data and test onboarding redirect
      await esClient.indices.deleteDataStream({ name: LOGS_INDEX });
      await esClient.indices.createDataStream({ name: LOGS_INDEX });
      await page.goto('/app/observability');
      await expect(page).toHaveURL(/\/app\/observabilityOnboarding/, { timeout: 10000 });
      expect(page.url()).toContain('/app/observabilityOnboarding');
    });
  });
});

/**
 * Generate synthetic logs data for testing
 */
async function generateLogsData(synthtraceClient: LogsSynthtraceEsClient): Promise<void> {
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

  await synthtraceClient.index(logsData);
}

/**
 * Generate synthetic APM data for testing
 */
async function generateApmData(synthtraceClient: ApmSynthtraceEsClient): Promise<void> {
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

  await synthtraceClient.index(apmData);
}
