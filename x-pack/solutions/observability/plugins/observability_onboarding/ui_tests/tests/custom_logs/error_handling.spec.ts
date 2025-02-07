/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';

const CUSTOM_INTEGRATION_NAME = 'mylogs';
const LOG_FILE_PATH = 'mylogs.log';

test.describe(
  'OBservability Onboarding - Custom Integration Error',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.afterEach(async ({ fleetApi }) => {
      await fleetApi.integration.delete(CUSTOM_INTEGRATION_NAME);
    });

    test('should be displayed when user has no previleges', async ({
      browserAuth,
      pageObjects: { customLogs },
    }) => {
      await browserAuth.loginAsPrivilegedUser();
      await customLogs.goto();
      await customLogs.getLogFilePathInputField(0).fill(LOG_FILE_PATH);
      await customLogs.continueButton.click();
      await expect(
        customLogs.customIntegrationInstalledCallout,
        `'mylogs integration installed' should be displayed`
      ).toBeVisible();

      await expect(
        customLogs.apiKeyPrivilegesErrorCallout,
        `'User does not have permissions to create API key' should be displayed`
      ).toBeVisible();
    });

    test('should be displayed when API Key creation failed', async ({
      browserAuth,
      pageObjects: { customLogs },
      page,
    }) => {
      await page.route('**/observability_onboarding/logs/flow', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({
            message: 'Internal error',
          }),
        });
      });
      await browserAuth.loginAsAdmin();
      await customLogs.goto();
      await customLogs.getLogFilePathInputField(0).fill(LOG_FILE_PATH);
      await customLogs.continueButton.click();
      await expect(
        customLogs.customIntegrationInstalledCallout,
        `'mylogs integration installed' should be displayed`
      ).toBeVisible();

      await expect(
        customLogs.apiKeyCreateErrorCallout,
        `'Failed to create API Key' should be displayed`
      ).toBeVisible();
    });

    test('should be displayed when integration failed', async ({
      browserAuth,
      pageObjects: { customLogs },
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

      await browserAuth.loginAsAdmin();
      await customLogs.goto();
      await customLogs.getLogFilePathInputField(0).fill(`${CUSTOM_INTEGRATION_NAME}.log`);
      await customLogs.continueButton.click();

      await expect(customLogs.customIntegrationErrorCallout).toBeVisible();
    });

    test('should be displayed when integration with the same name exists', async ({
      browserAuth,
      pageObjects: { customLogs },
      fleetApi,
      page,
    }) => {
      await fleetApi.integration.install(CUSTOM_INTEGRATION_NAME);
      await browserAuth.loginAsAdmin();
      await customLogs.goto();

      await customLogs.getLogFilePathInputField(0).fill(`${CUSTOM_INTEGRATION_NAME}.log`);
      await customLogs.continueButton.click();

      const errorMessage = `Failed to create the integration as an installation with the name ${CUSTOM_INTEGRATION_NAME} already exists.`;
      await expect(page.getByText(errorMessage)).toBeVisible();
    });
  }
);
