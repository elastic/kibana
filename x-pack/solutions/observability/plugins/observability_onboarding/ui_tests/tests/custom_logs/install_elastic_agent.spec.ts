/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, Locator } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';

const checkAgentStatusUpdated = async (locator: Locator, status: string) =>
  expect(locator.getByText(status)).toBeVisible();

test.describe('Observability Onboarding - Elastic Agent', { tag: ['@ess', '@svlOblt'] }, () => {
  let onboardingId: string;

  test.beforeEach(async ({ browserAuth, pageObjects, page }) => {
    await page.route('**/observability_onboarding/logs/flow', async (route) => {
      const response = await route.fetch();
      const body = await response.json();

      onboardingId = body.onboardingId;

      await route.fulfill({ response });
    });

    // login and create custom integration
    await browserAuth.loginAsAdmin();
    await pageObjects.customLogs.goto();
    await pageObjects.customLogs.getLogFilePathInputField(0).fill(testData.LOG_FILE_PATH);
    await pageObjects.customLogs.continueButton.click();
    await pageObjects.customLogs.apiKeyCreatedCallout.waitFor({ state: 'visible' });
  });

  test.afterEach(async ({ fleetApi }) => {
    await fleetApi.integration.delete(testData.CUSTOM_INTEGRATION_NAME);
  });

  test('should be installed sucessfully', async ({
    pageObjects: { customLogs },
    onboardingApi,
    page,
  }) => {
    // download agent
    await onboardingApi.updateInstallationStepStatus(onboardingId, 'ea-download', 'loading');
    await checkAgentStatusUpdated(
      customLogs.getStepStatusLocator('loading'),
      'Downloading Elastic Agent'
    );

    await onboardingApi.updateInstallationStepStatus(onboardingId, 'ea-download', 'danger');
    await expect(customLogs.getStepStatusLocator('danger'), 'Download Elastic Agent').toBeVisible();

    await onboardingApi.updateInstallationStepStatus(onboardingId, 'ea-download', 'complete');
    await checkAgentStatusUpdated(
      customLogs.getStepStatusLocator('complete'),
      'Elastic Agent downloaded'
    );

    // extract agent
    await onboardingApi.updateInstallationStepStatus(onboardingId, 'ea-extract', 'loading');
    await checkAgentStatusUpdated(
      customLogs.getStepStatusLocator('loading'),
      'Extracting Elastic Agent'
    );

    await onboardingApi.updateInstallationStepStatus(onboardingId, 'ea-extract', 'complete');
    await checkAgentStatusUpdated(
      customLogs.getStepStatusLocator('complete'),
      'Elastic Agent extracted'
    );

    // install agent
    await onboardingApi.updateInstallationStepStatus(onboardingId, 'ea-install', 'danger');
    await checkAgentStatusUpdated(
      customLogs.getStepStatusLocator('danger'),
      'Install Elastic Agent'
    );

    await onboardingApi.updateInstallationStepStatus(onboardingId, 'ea-install', 'complete');
    await checkAgentStatusUpdated(
      customLogs.getStepStatusLocator('complete'),
      'Elastic Agent installed'
    );

    // agent status
    await onboardingApi.updateInstallationStepStatus(onboardingId, 'ea-status', 'loading');
    await checkAgentStatusUpdated(
      customLogs.getStepStatusLocator('loading'),
      'Connecting to the Elastic Agent'
    );

    await expect(customLogs.getCheckLogsStepLocator('incomplete')).toBeVisible();
    await expect(
      page.locator('.euiStep__title', {
        hasText: 'Ship logs to Elastic Observability',
      })
    ).toBeVisible();

    await onboardingApi.updateInstallationStepStatus(onboardingId, 'ea-status', 'complete', {
      agentId: 'test-agent-id',
    });
    await checkAgentStatusUpdated(
      customLogs.getStepStatusLocator('complete'),
      'Connected to the Elastic Agent'
    );
  });

  test('should be configured sucessfully for Linux and wait for logs', async ({
    pageObjects: { customLogs },
    onboardingApi,
    page,
  }) => {
    // install and connect agent for linux
    await customLogs.autoDownloadConfigurationToggle.click();
    await onboardingApi.updateInstallationStepStatus(onboardingId, 'ea-download', 'complete');
    await onboardingApi.updateInstallationStepStatus(onboardingId, 'ea-extract', 'complete');
    await onboardingApi.updateInstallationStepStatus(onboardingId, 'ea-install', 'complete');
    await onboardingApi.updateInstallationStepStatus(onboardingId, 'ea-status', 'complete', {
      agentId: 'test-agent-id',
    });

    await onboardingApi.updateInstallationStepStatus(onboardingId, 'ea-config', 'loading');
    await checkAgentStatusUpdated(
      customLogs.getStepStatusLocator('loading'),
      'Downloading Elastic Agent config'
    );

    await onboardingApi.updateInstallationStepStatus(onboardingId, 'ea-config', 'complete');
    await checkAgentStatusUpdated(
      customLogs.getStepStatusLocator('complete'),
      'Elastic Agent config written to /opt/Elastic/Agent/elastic-agent.yml'
    );

    await expect(
      page.testSubj
        .locator('obltOnboardingCheckLogsStep')
        .locator('.euiStep__titleWrapper [class$="euiStepNumber-s-loading"]')
    ).toBeVisible();

    await expect(
      page.locator('.euiStep__title', { hasText: 'Waiting for logs to be shipped...' })
    ).toBeVisible();
  });

  test('should be configured sucessfully for MacOS and wait for logs', async ({
    pageObjects: { customLogs },
    onboardingApi,
    page,
  }) => {
    // install and connect agent for macos
    await customLogs.selectPlatform('macos');
    await customLogs.autoDownloadConfigurationToggle.click();
    await onboardingApi.updateInstallationStepStatus(onboardingId, 'ea-download', 'complete');
    await onboardingApi.updateInstallationStepStatus(onboardingId, 'ea-extract', 'complete');
    await onboardingApi.updateInstallationStepStatus(onboardingId, 'ea-install', 'complete');
    await onboardingApi.updateInstallationStepStatus(onboardingId, 'ea-status', 'complete', {
      agentId: 'test-agent-id',
    });

    await onboardingApi.updateInstallationStepStatus(onboardingId, 'ea-config', 'complete');
    await checkAgentStatusUpdated(
      customLogs.getStepStatusLocator('complete'),
      'Elastic Agent config written to /Library/Elastic/Agent/elastic-agent.yml'
    );

    await expect(customLogs.getCheckLogsStepLocator('loading')).toBeVisible();

    await expect(
      page.locator('.euiStep__title', { hasText: 'Waiting for logs to be shipped...' })
    ).toBeVisible();
  });

  test('should ship logs to Elastic', async ({ page, pageObjects: { customLogs } }) => {
    await page.route('**/progress', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          progress: {
            'ea-download': { status: 'complete' },
            'ea-extract': { status: 'complete' },
            'ea-install': { status: 'complete' },
            'ea-status': { status: 'complete' },
            'ea-config': { status: 'complete' },
            'logs-ingest': { status: 'complete' },
          },
        }),
      });
    });

    await expect(customLogs.getCheckLogsStepLocator('complete')).toBeVisible();
    await expect(
      page.locator('.euiStep__title', { hasText: 'Logs are being shipped!' })
    ).toBeVisible();

    await page.testSubj.click('obltOnboardingExploreLogs');
    await expect(page).toHaveURL(/\/app\/discover/);
  });
});
