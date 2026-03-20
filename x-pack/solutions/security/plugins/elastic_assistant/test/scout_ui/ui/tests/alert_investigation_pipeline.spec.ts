/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '@kbn/scout-security';

test.describe(
  'Alert Investigation Pipeline - Dashboard E2E',
  { tag: [tags.STATEFUL, tags.BROWSER_UI] },
  () => {
    test.beforeEach(async ({ auth }) => {
      // Authenticate before each test
      await auth.loginAsElasticUser();
    });

    test('should navigate to pipeline dashboard from Kibana nav', async ({ page }) => {
      await test.step('open Kibana home', async () => {
        await page.goto('/app/home');
        await expect(page).toHaveTitle(/Home - Elastic/);
      });

      await test.step('navigate to Alert Investigation Pipeline via direct URL', async () => {
        await page.goto('/app/alert-investigation-pipeline');

        // Wait for dashboard to load
        await expect(page.getByText('Alert Investigation Pipeline')).toBeVisible({
          timeout: 10000,
        });
      });

      await test.step('verify dashboard components render', async () => {
        // Health/metrics panel should be visible
        await expect(page.getByText('Total Runs')).toBeVisible();
        await expect(page.getByText('Success Rate')).toBeVisible();
        await expect(page.getByText('Avg Duration')).toBeVisible();

        // Refresh button should exist
        await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible();
      });
    });

    test('should display pipeline health status', async ({ page }) => {
      await test.step('navigate to dashboard', async () => {
        await page.goto('/app/alert-investigation-pipeline');
        await expect(page.getByText('Alert Investigation Pipeline')).toBeVisible();
      });

      await test.step('verify health status is displayed', async () => {
        // Wait for health API response
        await page.waitForResponse(
          (response) =>
            response.url().includes('/attack_discovery/pipeline/_health') &&
            response.status() === 200,
          { timeout: 10000 }
        );

        // Health status should be one of: HEALTHY, DEGRADED, UNHEALTHY
        const healthText = page.locator('text=/HEALTHY|DEGRADED|UNHEALTHY/');
        await expect(healthText).toBeVisible({ timeout: 5000 });
      });
    });

    test('should load and display metrics', async ({ page }) => {
      await test.step('navigate to dashboard', async () => {
        await page.goto('/app/alert-investigation-pipeline');
        await expect(page.getByText('Alert Investigation Pipeline')).toBeVisible();
      });

      await test.step('verify metrics load', async () => {
        // Wait for metrics API response
        await page.waitForResponse(
          (response) =>
            response.url().includes('/attack_discovery/pipeline/_metrics') &&
            response.status() === 200,
          { timeout: 10000 }
        );

        // Metrics should be displayed (even if zero)
        await expect(page.getByText('Alerts Processed')).toBeVisible();
        await expect(page.getByText('Cases Matched')).toBeVisible();
        await expect(page.getByText('Cases Created')).toBeVisible();
        await expect(page.getByText('Alerts Attached')).toBeVisible();
        await expect(page.getByText('AD Triggered')).toBeVisible();
      });
    });

    test('should handle refresh action', async ({ page }) => {
      await test.step('navigate to dashboard', async () => {
        await page.goto('/app/alert-investigation-pipeline');
        await expect(page.getByText('Alert Investigation Pipeline')).toBeVisible();
      });

      await test.step('click refresh button', async () => {
        const refreshButton = page.getByRole('button', { name: /refresh/i });
        await expect(refreshButton).toBeVisible();

        // Click refresh
        await refreshButton.click();

        // Wait for API calls to complete
        await page.waitForResponse(
          (response) =>
            response.url().includes('/attack_discovery/pipeline/_') && response.status() === 200,
          { timeout: 10000 }
        );

        // Button should be enabled again
        await expect(refreshButton).toBeEnabled();
      });
    });

    test('should display "Last run" timestamp', async ({ page }) => {
      await test.step('navigate to dashboard', async () => {
        await page.goto('/app/alert-investigation-pipeline');
        await expect(page.getByText('Alert Investigation Pipeline')).toBeVisible();
      });

      await test.step('verify last run info is displayed', async () => {
        // Wait for metrics API to complete
        await page.waitForResponse(
          (response) =>
            response.url().includes('/attack_discovery/pipeline/_metrics') &&
            response.status() === 200,
          { timeout: 10000 }
        );

        // "Last run:" label should exist
        await expect(page.getByText(/Last run:/i)).toBeVisible();

        // Timestamp should be displayed (either "Never" or a formatted date)
        const timestampRegex = /Never|\d{1,2}\/\d{1,2}\/\d{4}/; // Matches "Never" or date format
        await expect(page.locator(`text=${timestampRegex}`)).toBeVisible({
          timeout: 5000,
        });
      });
    });

    test('should gracefully handle API errors', async ({ page, context }) => {
      await test.step('block API requests to simulate error', async () => {
        // Block health and metrics APIs
        await context.route('**/attack_discovery/pipeline/_health', (route) => {
          route.abort('failed');
        });
        await context.route('**/attack_discovery/pipeline/_metrics', (route) => {
          route.abort('failed');
        });
      });

      await test.step('navigate to dashboard', async () => {
        await page.goto('/app/alert-investigation-pipeline');
        await expect(page.getByText('Alert Investigation Pipeline')).toBeVisible();
      });

      await test.step('verify error UI is displayed', async () => {
        // Error callout should appear
        await expect(
          page.locator('text=/Error fetching pipeline data|Failed to fetch/i')
        ).toBeVisible({ timeout: 5000 });

        // Refresh button should still be visible (allow retry)
        await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible();
      });
    });

    test('should have no console errors on load', async ({ page }) => {
      const consoleErrors: string[] = [];

      // Capture console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await test.step('navigate to dashboard', async () => {
        await page.goto('/app/alert-investigation-pipeline');
        await expect(page.getByText('Alert Investigation Pipeline')).toBeVisible();
      });

      await test.step('wait for all network activity to complete', async () => {
        // Wait for both health and metrics API calls
        await page.waitForResponse(
          (response) =>
            response.url().includes('/attack_discovery/pipeline/') && response.status() === 200,
          { timeout: 10000 }
        );
      });

      await test.step('verify no console errors', async () => {
        // Filter out known/expected errors (if any)
        const unexpectedErrors = consoleErrors.filter(
          (err) =>
            !err.includes('ResizeObserver') && // Known Kibana warning
            !err.includes('favicon') // Missing favicon is OK
        );

        expect(unexpectedErrors).toHaveLength(0);
      });
    });
  }
);
