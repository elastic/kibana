/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, spaceTest } from '@kbn/scout-security';

spaceTest.describe('Cloud Connectors - Reuse Existing', { tag: ['@ess', '@svlSecurity'] }, () => {
  spaceTest.beforeEach(async ({ browserAuth }) => {
    // Use admin for stateful tests (has all permissions including fleet-cloud-connector)
    await browserAuth.loginAsAdmin();
  });

  spaceTest.afterEach(async ({ apiServices }) => {
    await apiServices.cloudConnectorApi.deleteAllCloudConnectors();
  });

  spaceTest(
    'AWS CSPM - Reuse existing cloud connector',
    async ({ pageObjects, apiServices, page }) => {
      // Create first integration
      const firstName = `aws-cspm-cc-1-${Date.now()}`;
      const roleArn = 'arn:aws:iam::123456789012:role/TestRole';
      const connectorName = 'test-aws-connector-reuse';

      await pageObjects.cspmIntegrationPage.navigate();
      await pageObjects.cspmIntegrationPage.selectProvider('aws');
      await pageObjects.cspmIntegrationPage.selectAccountType('aws', 'organization');
      await pageObjects.cspmIntegrationPage.selectSetupTechnology('agentless');
      // Cloud connectors is selected by default when agentless + cloud connectors are enabled
      await pageObjects.cspmIntegrationPage.fillCloudConnectorName(connectorName);
      await pageObjects.cspmIntegrationPage.fillCloudConnectorRoleArn(roleArn);
      // External ID is optional - fill if field is present
      await pageObjects.cspmIntegrationPage.fillAwsCloudConnectorExternalId('test-external-id');
      await pageObjects.cspmIntegrationPage.fillIntegrationName(firstName);
      await pageObjects.cspmIntegrationPage.saveIntegration();

      // Wait for agentless enrollment flyout (not modal for agentless policies)
      await expect(page.getByTestId('agentlessEnrollmentFlyout')).toBeVisible({
        timeout: 60000,
      });

      // Close the flyout
      await page.getByTestId('euiFlyoutCloseButton').click();
      await expect(page.getByTestId('agentlessEnrollmentFlyout')).toBeHidden();

      // Wait for the integration to be fully created and visible in the list
      await expect(page.getByTestId('agentlessIntegrationNameLink')).toHaveCount(1, {
        timeout: 30000,
      });

      // Get the cloud connector we just created by name (we know the name from fillCloudConnectorName above)
      const allConnectors = await apiServices.cloudConnectorApi.getAllCloudConnectors();
      const connector = allConnectors.find((c) => c.name === connectorName);
      expect(connector).toBeTruthy();
      const connectorId = connector!.id;

      // Create second integration reusing connector
      const secondName = `aws-cspm-cc-2-${Date.now()}`;
      await pageObjects.cspmIntegrationPage.navigate();
      await pageObjects.cspmIntegrationPage.selectProvider('aws');
      await pageObjects.cspmIntegrationPage.selectAccountType('aws', 'organization');
      await pageObjects.cspmIntegrationPage.selectSetupTechnology('agentless');
      // Cloud connectors is selected by default when agentless + cloud connectors are enabled
      await pageObjects.cspmIntegrationPage.selectExistingCloudConnector('aws', connectorName);

      // In test environment with mock agentless API, error notifications may appear about
      // missing agent policy enrollment. Dismiss both modal and toast if present.
      const errorToast = page.getByTestId('globalToastList');
      // eslint-disable-next-line playwright/no-conditional-in-test
      if (await errorToast.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page.getByTestId('toastCloseButton').click();
        await errorToast.waitFor({ state: 'hidden' });
      }

      await pageObjects.cspmIntegrationPage.fillIntegrationName(secondName);
      await pageObjects.cspmIntegrationPage.saveIntegration();

      // Wait for agentless enrollment flyout (not modal for agentless policies)
      await expect(page.getByTestId('agentlessEnrollmentFlyout')).toBeVisible({
        timeout: 60000,
      });

      // Close the flyout and navigate to integration edit page
      await page.getByTestId('euiFlyoutCloseButton').click();
      await expect(page.getByTestId('agentlessEnrollmentFlyout')).toBeHidden();

      // Get the second integration's policy ID from the list
      // There should now be 2 integrations listed, both using the same connector
      await expect(page.getByTestId('agentlessIntegrationNameLink')).toHaveCount(2);
      const integrationLinks = await page.getByTestId('agentlessIntegrationNameLink').all();

      // Click the second integration to get its policy ID
      await integrationLinks[1].click();
      const secondPolicyIdMatch = page.url().match(/edit-integration\/([^/?]+)/);
      expect(secondPolicyIdMatch).toBeTruthy();
      const secondPolicyId = secondPolicyIdMatch![1];

      // Validate both policies share same connector
      const secondPolicy = await apiServices.cloudConnectorApi.getPackagePolicy(secondPolicyId);
      expect(secondPolicy.cloud_connector_id).toBe(connectorId);
      expect(secondPolicy.supports_cloud_connector).toBe(true);

      // Validate stream vars from enabled input
      const secondEnabledInput = secondPolicy.inputs.find((input: any) => input.enabled);
      expect(secondEnabledInput).toBeTruthy();
      const secondStreamVars = secondEnabledInput.streams[0].vars;
      expect(secondStreamVars['aws.supports_cloud_connectors'].value).toBe(true);
    }
  );

  spaceTest(
    'Azure CSPM - Reuse existing cloud connector',
    async ({ pageObjects, apiServices, page }) => {
      // Create first integration
      const firstName = `azure-cspm-cc-1-${Date.now()}`;
      const tenantId = 'test-tenant-id';
      const clientId = 'test-client-id';
      const credentialsId = 'test-credentials-id';
      const connectorName = 'test-azure-connector-reuse';

      await pageObjects.cspmIntegrationPage.navigate();
      await pageObjects.cspmIntegrationPage.selectProvider('azure');
      await pageObjects.cspmIntegrationPage.selectAccountType('azure', 'organization');
      await pageObjects.cspmIntegrationPage.selectSetupTechnology('agentless');
      // Cloud connectors is selected by default when agentless + cloud connectors are enabled
      await pageObjects.cspmIntegrationPage.fillCloudConnectorName(connectorName);
      await pageObjects.cspmIntegrationPage.fillAzureCloudConnectorDetails(
        tenantId,
        clientId,
        credentialsId
      );
      await pageObjects.cspmIntegrationPage.fillIntegrationName(firstName);
      await pageObjects.cspmIntegrationPage.saveIntegration();

      // Wait for agentless enrollment flyout (not modal for agentless policies)
      await expect(page.getByTestId('agentlessEnrollmentFlyout')).toBeVisible({ timeout: 60000 });

      // Close the flyout
      await page.getByTestId('euiFlyoutCloseButton').click();
      await expect(page.getByTestId('agentlessEnrollmentFlyout')).toBeHidden();

      // Wait for the integration to be fully created and visible in the list
      await expect(page.getByTestId('agentlessIntegrationNameLink')).toHaveCount(1, {
        timeout: 30000,
      });

      // Get the cloud connector we just created by name
      const allConnectors = await apiServices.cloudConnectorApi.getAllCloudConnectors();
      const connector = allConnectors.find((c) => c.name === connectorName);
      expect(connector).toBeTruthy();
      const connectorId = connector!.id;

      // Create second integration reusing connector
      const secondName = `azure-cspm-cc-2-${Date.now()}`;
      await pageObjects.cspmIntegrationPage.navigate();
      await pageObjects.cspmIntegrationPage.selectProvider('azure');
      await pageObjects.cspmIntegrationPage.selectAccountType('azure', 'organization');
      await pageObjects.cspmIntegrationPage.selectSetupTechnology('agentless');
      // Cloud connectors is selected by default when agentless + cloud connectors are enabled
      await pageObjects.cspmIntegrationPage.selectExistingCloudConnector('azure', connectorName);

      // In test environment with mock agentless API, error notifications may appear about
      // missing agent policy enrollment. Dismiss both modal and toast if present.
      const azureErrorToast = page.getByTestId('globalToastList');
      // eslint-disable-next-line playwright/no-conditional-in-test
      if (await azureErrorToast.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page.getByTestId('toastCloseButton').click();
        await azureErrorToast.waitFor({ state: 'hidden' });
      }

      await pageObjects.cspmIntegrationPage.fillIntegrationName(secondName);
      await pageObjects.cspmIntegrationPage.saveIntegration();

      // Wait for agentless enrollment flyout (not modal for agentless policies)
      await expect(page.getByTestId('agentlessEnrollmentFlyout')).toBeVisible({ timeout: 60000 });

      // Close the flyout and navigate to integration edit page
      await page.getByTestId('euiFlyoutCloseButton').click();
      await expect(page.getByTestId('agentlessEnrollmentFlyout')).toBeHidden();

      // Click the second integration link to navigate to edit page
      const secondIntegrationLinks = await page.getByTestId('agentlessIntegrationNameLink').all();
      await secondIntegrationLinks[1].click();

      // Wait for navigation and extract policy ID from URL
      await page.waitForURL(/edit-integration/);
      const secondPolicyIdMatch = page.url().match(/edit-integration\/([^/?]+)/);
      expect(secondPolicyIdMatch).toBeTruthy();
      const secondPolicyId = secondPolicyIdMatch![1];

      // Validate both policies share same connector
      const secondPolicy = await apiServices.cloudConnectorApi.getPackagePolicy(secondPolicyId);
      expect(secondPolicy.cloud_connector_id).toBe(connectorId);
      expect(secondPolicy.supports_cloud_connector).toBe(true);

      // Validate stream vars from enabled input
      const secondEnabledInput = secondPolicy.inputs.find((input: any) => input.enabled);
      expect(secondEnabledInput).toBeTruthy();
      const secondStreamVars = secondEnabledInput.streams[0].vars;
      expect(secondStreamVars['azure.supports_cloud_connectors'].value).toBe(true);
    }
  );
});
