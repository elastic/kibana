/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';

const CUSTOM_INTEGRATION_NAME = 'mylogs';

test.describe(
  'OBservability Onboarding - Custom Integration',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects: { customLogs } }) => {
      await browserAuth.loginAsAdmin();
      await customLogs.goto();
    });

    test.afterEach(async ({ fleetApi }) => {
      await fleetApi.integration.delete(CUSTOM_INTEGRATION_NAME);
    });

    test('should be installed, show API Key and correct instructions', async ({
      pageObjects: { customLogs },
      page,
    }) => {
      await customLogs.getLogFilePathInputField(0).fill('mylogs.log');
      await expect(customLogs.integrationNameInput).toHaveValue(CUSTOM_INTEGRATION_NAME);
      await expect(customLogs.datasetNameInput).toHaveValue(CUSTOM_INTEGRATION_NAME);
      await expect(customLogs.serviceNameInput).toHaveValue('');

      await customLogs.continueButton.click();
      await expect(
        customLogs.customIntegrationInstalledCallout,
        `'mylogs integration installed' should be displayed`
      ).toBeVisible();

      await expect(
        customLogs.apiKeyCreatedCallout,
        `'API Key created' should be displayed`
      ).toBeVisible();

      // validate default 'Install the Elastic Agent' instructions
      await expect(page.testSubj.locator('linux-tar')).toHaveAttribute('aria-pressed', 'true');
      await expect(customLogs.autoDownloadConfigurationToggle).not.toBeChecked();

      await customLogs.selectPlatform('macos');
      await expect(customLogs.autoDownloadConfigurationToggle).not.toBeChecked();

      await customLogs.selectPlatform('windows');
      await expect(customLogs.autoDownloadConfigurationToggle).toBeDisabled();
      await expect(customLogs.windowsInstallElasticAgentDocLink).toBeVisible();
    });

    test('should update instructions when automatic Agent config toggled', async ({
      pageObjects: { customLogs },
    }) => {
      await customLogs.getLogFilePathInputField(0).fill('mylogs.log');
      await customLogs.continueButton.click();

      await customLogs.autoDownloadConfigurationToggle.click();
      await expect(customLogs.autoDownloadConfigurationCallout).toBeVisible();
      await expect(customLogs.installCodeSnippet).toContainText('autoDownloadConfig=1');

      await customLogs.selectPlatform('macos');
      await expect(customLogs.autoDownloadConfigurationCallout).toBeVisible();
      await expect(customLogs.installCodeSnippet).toContainText('autoDownloadConfig=1');
    });
  }
);
