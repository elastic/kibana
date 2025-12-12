/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, spaceTest } from '@kbn/scout-security';

spaceTest.describe('Cloud Connectors - Create New', { tag: ['@ess', '@svlSecurity'] }, () => {
  spaceTest.beforeEach(async ({ browserAuth }) => {
    // Use admin for stateful tests (has all permissions including fleet-cloud-connector)
    await browserAuth.loginAsAdmin();
  });

  spaceTest.afterEach(async ({ apiServices }) => {
    await apiServices.cloudConnectorApi.deleteAllCloudConnectors();
  });

  spaceTest(
    'AWS CSPM - Create organization account with new cloud connector',
    async ({ pageObjects, apiServices, page }) => {
      const integrationName = `aws-cspm-cc-${Date.now()}`;
      const roleArn = 'arn:aws:iam::123456789012:role/TestRole';

      // Navigate and configure integration
      await pageObjects.cspmIntegrationPage.navigate();
      await pageObjects.cspmIntegrationPage.selectProvider('aws');
      await pageObjects.cspmIntegrationPage.selectAccountType('aws', 'organization');
      await pageObjects.cspmIntegrationPage.selectSetupTechnology('agentless');
      // Cloud connectors is selected by default when agentless + cloud connectors are enabled
      await pageObjects.cspmIntegrationPage.fillCloudConnectorName('test-aws-connector');
      await pageObjects.cspmIntegrationPage.fillCloudConnectorRoleArn(roleArn);
      // External ID is optional - fill if field is present
      await pageObjects.cspmIntegrationPage.fillAwsCloudConnectorExternalId('test-external-id');
      await pageObjects.cspmIntegrationPage.fillIntegrationName(integrationName);
      await pageObjects.cspmIntegrationPage.saveIntegration();

      // Wait for agentless enrollment flyout (not modal for agentless policies)
      await expect(page.getByTestId('agentlessEnrollmentFlyout')).toBeVisible({ timeout: 60000 });

      // Close the flyout and navigate to integration edit page
      await page.getByTestId('euiFlyoutCloseButton').click();
      await expect(page.getByTestId('agentlessEnrollmentFlyout')).toBeHidden();

      // Click the integration link to navigate to edit page
      const integrationLinks = await page.getByTestId('agentlessIntegrationNameLink').all();
      await integrationLinks[0].click();

      // Wait for navigation and extract policy ID from URL (format: edit-integration/<id>)
      await page.waitForURL(/edit-integration/);
      const policyIdMatch = page.url().match(/edit-integration\/([^/?]+)/);
      expect(policyIdMatch).toBeTruthy();
      const policyId = policyIdMatch![1];

      // Validate package policy attributes
      const packagePolicy = await apiServices.cloudConnectorApi.getPackagePolicy(policyId);
      expect(packagePolicy.supports_cloud_connector).toBe(true);
      expect(packagePolicy.cloud_connector_id).toBeTruthy();

      // Validate stream vars from enabled input
      const enabledInput = packagePolicy.inputs.find((input: any) => input.enabled);
      expect(enabledInput).toBeTruthy();
      const streamVars = enabledInput.streams[0].vars;
      expect(streamVars['aws.supports_cloud_connectors'].value).toBe(true);
      expect(streamVars.role_arn.value).toBe(roleArn);
      expect(streamVars['aws.credentials.external_id'].value).toBeTruthy();

      // Validate cloud connector
      const cloudConnector = await apiServices.cloudConnectorApi.getCloudConnector(
        packagePolicy.cloud_connector_id
      );
      expect(cloudConnector.packagePolicyCount).toBe(1);
      expect(cloudConnector.accountType).toBe('organization-account');
      expect(cloudConnector.cloudProvider).toBe('aws');
    }
  );

  spaceTest(
    'Azure CSPM - Create organization account with new cloud connector',
    async ({ pageObjects, apiServices, page }) => {
      const integrationName = `azure-cspm-cc-${Date.now()}`;
      const tenantId = 'test-tenant-id';
      const clientId = 'test-client-id';
      const credentialsId = 'test-credentials-id';

      await pageObjects.cspmIntegrationPage.navigate();
      await pageObjects.cspmIntegrationPage.selectProvider('azure');
      await pageObjects.cspmIntegrationPage.selectAccountType('azure', 'organization');
      await pageObjects.cspmIntegrationPage.selectSetupTechnology('agentless');
      // Cloud connectors is selected by default when agentless + cloud connectors are enabled
      await pageObjects.cspmIntegrationPage.fillCloudConnectorName('test-azure-connector');
      await pageObjects.cspmIntegrationPage.fillAzureCloudConnectorDetails(
        tenantId,
        clientId,
        credentialsId
      );
      await pageObjects.cspmIntegrationPage.fillIntegrationName(integrationName);
      await pageObjects.cspmIntegrationPage.saveIntegration();

      // Wait for agentless enrollment flyout (not modal for agentless policies)
      await expect(page.getByTestId('agentlessEnrollmentFlyout')).toBeVisible({ timeout: 60000 });

      // Close the flyout and navigate to integration edit page
      await page.getByTestId('euiFlyoutCloseButton').click();
      await expect(page.getByTestId('agentlessEnrollmentFlyout')).toBeHidden();

      // Click the integration link to navigate to edit page
      const integrationLinks = await page.getByTestId('agentlessIntegrationNameLink').all();
      await integrationLinks[0].click();

      // Wait for navigation and extract policy ID from URL (format: edit-integration/<id>)
      await page.waitForURL(/edit-integration/);
      const policyIdMatch = page.url().match(/edit-integration\/([^/?]+)/);
      expect(policyIdMatch).toBeTruthy();
      const policyId = policyIdMatch![1];

      // Validate package policy attributes
      const packagePolicy = await apiServices.cloudConnectorApi.getPackagePolicy(policyId);
      expect(packagePolicy.supports_cloud_connector).toBe(true);
      expect(packagePolicy.cloud_connector_id).toBeTruthy();

      // Validate stream vars from enabled input
      const enabledInput = packagePolicy.inputs.find((input: any) => input.enabled);
      expect(enabledInput).toBeTruthy();
      const streamVars = enabledInput.streams[0].vars;
      expect(streamVars['azure.supports_cloud_connectors'].value).toBe(true);

      // Validate cloud connector
      const cloudConnector = await apiServices.cloudConnectorApi.getCloudConnector(
        packagePolicy.cloud_connector_id
      );
      expect(cloudConnector.packagePolicyCount).toBe(1);
      expect(cloudConnector.accountType).toBe('organization-account');
      expect(cloudConnector.cloudProvider).toBe('azure');
    }
  );
});
