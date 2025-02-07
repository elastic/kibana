/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../fixtures';

test.describe('Onboarding app - Custom logs configuration', { tag: ['@ess', '@svlOblt'] }, () => {
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

  test(`should allow addind multiple entries for Log File Path`, async ({
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
    await expect(customLogs.advancedSettingsContent).not.toBeVisible();
    await customLogs.clickAdvancedSettingsButton();
    await expect(
      customLogs.advancedSettingsContent,
      'Advanced Settings should be opened'
    ).toBeVisible();
    await expect(customLogs.namespaceInput).toHaveValue('default');

    await customLogs.clickAdvancedSettingsButton();
    await expect(
      customLogs.advancedSettingsContent,
      'Advanced Settings should be closed'
    ).not.toBeVisible();

    customLogs.clickAdvancedSettingsButton();
    await customLogs.namespaceInput.fill('');
    await expect(customLogs.continueButton).toBeDisabled();

    await customLogs.namespaceInput.fill('default');
    await customLogs.getLogFilePathInputField(0).fill('myLogs.log');
    await expect(customLogs.customConfigInput).toHaveValue('');
    await expect(customLogs.continueButton).not.toBeDisabled();
  });

  test('should validate Integration Name field', async ({ pageObjects: { customLogs }, page }) => {
    await customLogs.getLogFilePathInputField(0).fill('myLogs.log');

    await customLogs.integrationNameInput.fill('');
    await expect(customLogs.continueButton).toBeDisabled();

    await customLogs.integrationNameInput.fill('hello$world');
    await expect(customLogs.integrationNameInput).toHaveValue('hello_world');

    await customLogs.integrationNameInput.fill('H3llowOrld');
    await expect(page.getByText('An integration name should be lowercase.')).toBeVisible();
  });

  test('should validate DataSet Name field', async ({ pageObjects: { customLogs }, page }) => {
    await customLogs.getLogFilePathInputField(0).fill('myLogs.log');
    await customLogs.datasetNameInput.fill('');
    await expect(customLogs.continueButton).toBeDisabled();

    await customLogs.datasetNameInput.fill('hello$world');
    await expect(
      customLogs.datasetNameInput,
      `value should contain '_' instead of special chars`
    ).toHaveValue('hello_world');

    await customLogs.datasetNameInput.fill('H3llowOrld');
    await expect(page.getByText('A dataset name should be lowercase.')).toBeVisible();
  });
});
