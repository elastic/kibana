/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../fixtures';
import { CustomLogsPage } from '../../fixtures/page_objects/custom_logs';

test.describe('Onboarding app - Custom logs configuration', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects: { customLogsPage } }) => {
    await browserAuth.loginAsAdmin();
    await customLogsPage.goto();
  });

  test('When user clicks the back button user goes to the onboarding home page', async ({
    pageObjects: { customLogsPage },
    page,
  }) => {
    await customLogsPage.clickBackButton();
    expect(page.url()).toContain('/app/observabilityOnboarding');
  });

  test(`Users shouldn't be able to continue if logFilePaths is empty`, async ({
    pageObjects: { customLogsPage },
  }) => {
    await expect(customLogsPage.logFilePathInput(0)).toHaveValue('');
    await expect(customLogsPage.continueButton).toBeDisabled();
  });

  test(`Users should be able to continue if logFilePaths is not empty`, async ({
    pageObjects: { customLogsPage },
  }) => {
    await customLogsPage.logFilePathInput(0).fill('some/path');

    await expect(customLogsPage.continueButton).not.toBeDisabled();
  });

  test('Users can add multiple logFilePaths', async ({ pageObjects: { customLogsPage } }) => {
    await customLogsPage.addLogFilePathButton.click();
    await expect(customLogsPage.logFilePathInput(0)).toBeVisible();
    await expect(customLogsPage.logFilePathInput(1)).toBeVisible();
  });

  test('Users can delete logFilePaths', async ({ pageObjects: { customLogsPage } }) => {
    await customLogsPage.addLogFilePathButton.click();
    await expect(customLogsPage.logFilePathList).toHaveCount(2);

    await customLogsPage.logFilePathDeleteButton(1).click();
    await expect(customLogsPage.logFilePathList).toHaveCount(1);
  });

  test('Dataset Name and Integration Name are auto generated if it is the first path', async ({
    pageObjects: { customLogsPage },
  }) => {
    await customLogsPage.logFilePathInput(0).fill('myLogs.log');

    await expect(customLogsPage.integrationNameInput).toHaveValue('mylogs');
    await expect(customLogsPage.datasetNameInput).toHaveValue('mylogs');
  });

  test('Dataset Name and Integration Name are not generated if it is not the first path', async ({
    pageObjects: { customLogsPage },
  }) => {
    await customLogsPage.addLogFilePathButton.click();
    await customLogsPage.logFilePathInput(1).fill('myLogs.log');

    await expect(customLogsPage.integrationNameInput).toHaveValue('');
    await expect(customLogsPage.datasetNameInput).toHaveValue('');
  });

  test('Service name input should be optional allowing user to continue if it is empty', async ({
    pageObjects: { customLogsPage },
  }) => {
    await customLogsPage.logFilePathInput(0).fill('myLogs.log');

    await expect(customLogsPage.serviceNameInput).toHaveValue('');
    await expect(customLogsPage.continueButton).not.toBeDisabled();
  });

  test('Users should expand and collapse the Advanced settings section', async ({
    pageObjects: { customLogsPage },
  }) => {
    await expect(customLogsPage.advancedSettingsContent).not.toBeVisible();

    await customLogsPage.clickAdvancedSettingsButton();

    await expect(customLogsPage.advancedSettingsContent).toBeVisible();

    await customLogsPage.clickAdvancedSettingsButton();

    await expect(customLogsPage.advancedSettingsContent).not.toBeVisible();
  });

  test('Users should see a default namespace', async ({ pageObjects: { customLogsPage } }) => {
    customLogsPage.clickAdvancedSettingsButton();

    await expect(customLogsPage.namespaceInput).toHaveValue('default');
  });

  test('Users should not be able to continue if they do not specify a namespace', async ({
    pageObjects: { customLogsPage },
  }) => {
    customLogsPage.clickAdvancedSettingsButton();

    await customLogsPage.namespaceInput.fill('');
    await expect(customLogsPage.continueButton).toBeDisabled();
  });

  test('should be optional allowing user to continue if it is empty', async ({
    pageObjects: { customLogsPage },
  }) => {
    await customLogsPage.clickAdvancedSettingsButton();
    await customLogsPage.logFilePathInput(0).fill('myLogs.log');
    await expect(customLogsPage.customConfigInput).toHaveValue('');
    await expect(customLogsPage.continueButton).not.toBeDisabled();
  });

  test.describe('Integration name', () => {
    test.beforeEach(async ({ pageObjects: { customLogsPage } }) => {
      await customLogsPage.logFilePathInput(0).fill('myLogs.log');
    });

    test('Users should not be able to continue if they do not specify an integrationName', async ({
      pageObjects: { customLogsPage },
    }) => {
      await customLogsPage.integrationNameInput.fill('');
      await expect(customLogsPage.continueButton).toBeDisabled();
    });

    test('value will contain _ instead of special chars', async ({
      pageObjects: { customLogsPage },
    }) => {
      await customLogsPage.integrationNameInput.fill('hello$world');
      await expect(customLogsPage.integrationNameInput).toHaveValue('hello_world');
    });

    test('value will be invalid if it is not lowercase', async ({
      pageObjects: { customLogsPage },
      page,
    }) => {
      await customLogsPage.integrationNameInput.fill('H3llowOrld');
      await expect(
        page.getByText(CustomLogsPage.ASSERTION_MESSAGES.INTEGRATION_NAME_CASE_ERROR)
      ).toBeVisible();
    });
  });

  test.describe('datasetName', () => {
    test.beforeEach(async ({ pageObjects: { customLogsPage } }) => {
      await customLogsPage.logFilePathInput(0).fill('myLogs.log');
    });

    test('Users should not be able to continue if they do not specify a datasetName', async ({
      pageObjects: { customLogsPage },
    }) => {
      await customLogsPage.datasetNameInput.fill('');
      await expect(customLogsPage.continueButton).toBeDisabled();
    });

    test('value will contain _ instead of special chars', async ({
      pageObjects: { customLogsPage },
    }) => {
      await customLogsPage.datasetNameInput.fill('hello$world');
      await expect(customLogsPage.datasetNameInput).toHaveValue('hello_world');
    });

    test('value will be invalid if it is not lowercase', async ({
      pageObjects: { customLogsPage },
      page,
    }) => {
      await customLogsPage.datasetNameInput.fill('H3llowOrld');
      await expect(
        page.getByText(CustomLogsPage.ASSERTION_MESSAGES.DATASET_NAME_CASE_ERROR)
      ).toBeVisible();
    });
  });

  test.describe('Custom integration', () => {
    const CUSTOM_INTEGRATION_NAME = 'mylogs';

    test.beforeEach(async ({ pageObjects: { customLogsPage } }) => {
      await customLogsPage.deleteIntegration(CUSTOM_INTEGRATION_NAME);
    });

    test.describe('when user is missing privileges', () => {
      test.beforeEach(async ({ browserAuth, page }) => {
        await browserAuth.loginAsViewer();
        await page.reload();
      });

      test.afterEach(async ({ browserAuth, page }) => {
        await browserAuth.loginAsAdmin();
        await page.reload();
      });

      test('installation fails', async ({ pageObjects: { customLogsPage } }) => {
        await customLogsPage.logFilePathInput(0).fill(`${CUSTOM_INTEGRATION_NAME}.log`);
        await customLogsPage.continueButton.click();

        await expect(customLogsPage.customIntegrationErrorCallout).toBeVisible();
      });
    });

    test.describe('when user has proper privileges', () => {
      test('installation succeed and user is redirected to install elastic agent step', async ({
        page,
        pageObjects: { customLogsPage },
      }) => {
        await customLogsPage.logFilePathInput(0).fill(`${CUSTOM_INTEGRATION_NAME}.log`);
        await customLogsPage.continueButton.click();

        await page.waitForURL('**/app/observabilityOnboarding/customLogs/installElasticAgent');
      });
    });

    test('installation fails if integration already exists', async ({
      pageObjects: { customLogsPage },
      page,
    }) => {
      await customLogsPage.installCustomIntegration(CUSTOM_INTEGRATION_NAME);
      await customLogsPage.logFilePathInput(0).fill(`${CUSTOM_INTEGRATION_NAME}.log`);
      await customLogsPage.continueButton.click();

      await expect(
        page.getByText(
          CustomLogsPage.ASSERTION_MESSAGES.EXISTING_INTEGRATION_ERROR(CUSTOM_INTEGRATION_NAME)
        )
      ).toBeVisible();
    });

    test.describe('when an error occurred on creation', () => {
      test('user should see the error displayed', async ({
        pageObjects: { customLogsPage },
        page,
        kbnUrl,
      }) => {
        await page.route(kbnUrl.get('/api/fleet/epm/custom_integrations'), (route) => {
          route.fulfill({
            status: 500,
            json: {
              message: 'Internal error',
            },
          });
        });

        await customLogsPage.logFilePathInput(0).fill(`${CUSTOM_INTEGRATION_NAME}.log`);
        await customLogsPage.continueButton.click();

        await expect(customLogsPage.customIntegrationErrorCallout).toBeVisible();
      });
    });
  });
});
