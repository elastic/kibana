/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { assertionMessages, generateIntegrationName, test } from '../../fixtures';

test.describe(
  'Observability Onboarding - Custom logs configuration',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    const logsFilePath = `${generateIntegrationName('mylogs')}.log`;

    test.beforeEach(async ({ browserAuth, pageObjects: { customLogs } }) => {
      await browserAuth.loginAsAdmin();
      await customLogs.goto();
    });

    test('should navigate to the onboarding home page when the back button clicked', async ({
      pageObjects: { customLogs },
      page,
    }) => {
      await customLogs.clickBackButton();
      expect(page.url()).toContain('/app/observabilityOnboarding');
    });

    test(`should allow multiple entries for Log File Path`, async ({
      pageObjects: { customLogs },
    }) => {
      await expect(
        customLogs.getLogFilePathInputField(0),
        'Log File Path should be empty'
      ).toHaveValue('');
      await expect(
        customLogs.continueButton,
        'Continue button should be disabled when Log File Path is not set'
      ).toBeDisabled();
      await customLogs.addLogFilePathButton.click();
      await expect(customLogs.logFilePathList).toHaveCount(2);

      await customLogs.logFilePathDeleteButton(1).click();
      await expect(customLogs.logFilePathList).toHaveCount(1);
    });

    test(`should allow updating Advanced Settings`, async ({ pageObjects: { customLogs } }) => {
      await customLogs.getLogFilePathInputField(0).fill(logsFilePath);
      await expect(customLogs.advancedSettingsContent).toBeHidden();
      await customLogs.clickAdvancedSettingsButton();
      await expect(
        customLogs.advancedSettingsContent,
        'Advanced Settings should be opened'
      ).toBeVisible();
      await expect(customLogs.namespaceInput).toHaveValue('default');

      await customLogs.namespaceInput.fill('');
      await expect(
        customLogs.continueButton,
        'Continue button should be disabled when Namespace is empty'
      ).toBeDisabled();

      await customLogs.namespaceInput.fill('default');
      await expect(customLogs.customConfigInput).toHaveValue('');
      await expect(customLogs.continueButton).toBeEnabled();

      await customLogs.clickAdvancedSettingsButton();
      await expect(
        customLogs.advancedSettingsContent,
        'Advanced Settings should be closed'
      ).toBeHidden();
    });

    test('should validate Integration Name field', async ({
      pageObjects: { customLogs },
      page,
    }) => {
      await customLogs.getLogFilePathInputField(0).fill(logsFilePath);

      await customLogs.integrationNameInput.fill('');
      await expect(customLogs.continueButton).toBeDisabled();

      await customLogs.integrationNameInput.fill('hello$world');
      await expect(customLogs.integrationNameInput).toHaveValue('hello_world');

      await customLogs.integrationNameInput.fill('H3llowOrld');
      await expect(
        page.getByText(assertionMessages.FIELD_VALIDATION.INTEGRATION_NAME_LOWERCASE)
      ).toBeVisible();
    });

    test('should validate DataSet Name field', async ({ pageObjects: { customLogs }, page }) => {
      await customLogs.getLogFilePathInputField(0).fill(logsFilePath);
      await customLogs.datasetNameInput.fill('');
      await expect(customLogs.continueButton).toBeDisabled();

      await customLogs.datasetNameInput.fill('hello$world');
      await expect(customLogs.datasetNameInput).toHaveValue('hello_world');

      await customLogs.datasetNameInput.fill('H3llowOrld');
      await expect(
        page.getByText(assertionMessages.FIELD_VALIDATION.DATASET_NAME_LOWERCASE)
      ).toBeVisible();
    });
  }
);
