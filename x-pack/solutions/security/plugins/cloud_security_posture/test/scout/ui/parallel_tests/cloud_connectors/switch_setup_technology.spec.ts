/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AWS_INPUT_TEST_SUBJECTS,
  AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ,
} from '@kbn/cloud-security-posture-common';

import { expect, spaceTest } from '@kbn/scout-security';

spaceTest.describe(
  'Cloud Connectors - Switch Setup Technology',
  { tag: ['@ess', '@svlSecurity'] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth }) => {
      // Use admin for stateful tests (has all permissions including fleet-cloud-connector)
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.cloudConnectorApi.deleteAllCloudConnectors();
    });

    spaceTest(
      'AWS CSPM - Switch FROM cloud connectors to direct access keys',
      async ({ pageObjects, apiServices, page }) => {
        const integrationName = `aws-cspm-direct-${Date.now()}`;

        await pageObjects.cspmIntegrationPage.navigate();
        await pageObjects.cspmIntegrationPage.selectProvider('aws');
        await pageObjects.cspmIntegrationPage.selectAccountType('aws', 'organization');
        await pageObjects.cspmIntegrationPage.selectSetupTechnology('agentless');

        // Cloud connectors is selected by default, now switch to direct access keys
        const credentialsSelect = page.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
        await credentialsSelect.waitFor({ state: 'visible' });
        await credentialsSelect.selectOption('direct_access_keys');

        // Fill direct access credentials
        await page
          .getByTestId(AWS_INPUT_TEST_SUBJECTS.DIRECT_ACCESS_KEY_ID)
          .fill('test-access-key-id');
        await page
          .getByTestId(AWS_INPUT_TEST_SUBJECTS.DIRECT_ACCESS_SECRET_KEY)
          .fill('test-secret-key');
        await pageObjects.cspmIntegrationPage.fillIntegrationName(integrationName);
        await pageObjects.cspmIntegrationPage.saveIntegration();

        // Direct access keys is still agentless, so expect agentless enrollment flyout
        await expect(page.getByTestId('agentlessEnrollmentFlyout')).toBeVisible({
          timeout: 60000,
        });

        // Close the flyout
        await page.getByTestId('euiFlyoutCloseButton').click();
        await expect(page.getByTestId('agentlessEnrollmentFlyout')).toBeHidden();

        // Click the integration link to navigate to edit page
        const integrationLinks = await page.getByTestId('agentlessIntegrationNameLink').all();
        await integrationLinks[0].click();

        // Wait for navigation and extract policy ID from URL
        await page.waitForURL(/edit-integration/);
        const policyIdMatch = page.url().match(/edit-integration\/([^/?]+)/);
        expect(policyIdMatch).toBeTruthy();
        const policyId = policyIdMatch![1];

        // Validate NO cloud connector attributes
        const policy = await apiServices.cloudConnectorApi.getPackagePolicy(policyId);
        expect(policy.supports_cloud_connector).toBeFalsy();
        expect(policy.cloud_connector_id).toBeFalsy();

        // Validate stream var does NOT include supports_cloud_connector
        const streamVars = policy.inputs[0].streams[0].vars;
        expect(streamVars.supports_cloud_connector).toBeUndefined();
      }
    );

    // NOTE: Azure doesn't have a credentials selector like AWS to switch between
    // cloud connectors and ARM template within agentless mode. When cloud connectors
    // is enabled, the ARM template option is not available. This is by design.
    // Therefore, we skip the "Switch FROM cloud connectors to ARM template" test for Azure.

    spaceTest(
      'AWS CSPM - Switch FROM cloud connectors to agent-based',
      async ({ pageObjects, apiServices, page }) => {
        const integrationName = `aws-cspm-agent-${Date.now()}`;

        await pageObjects.cspmIntegrationPage.navigate();
        await pageObjects.cspmIntegrationPage.selectProvider('aws');
        await pageObjects.cspmIntegrationPage.selectAccountType('aws', 'organization');
        await pageObjects.cspmIntegrationPage.selectSetupTechnology('agentless');

        // Cloud connectors is selected by default
        // Switch setup technology to agent-based
        await pageObjects.cspmIntegrationPage.selectSetupTechnology('agent-based');

        await pageObjects.cspmIntegrationPage.fillIntegrationName(integrationName);

        // In test environment with mock agentless API, error toast may appear about
        // missing agent policy. Dismiss it if present before saving.
        const errorToast = page.getByTestId('globalToastList');
        // eslint-disable-next-line playwright/no-conditional-in-test
        if (await errorToast.isVisible({ timeout: 1000 }).catch(() => false)) {
          await page.getByTestId('toastCloseButton').click();
          await errorToast.waitFor({ state: 'hidden' });
        }

        await pageObjects.cspmIntegrationPage.saveIntegration();

        // Agent-based for AWS organization shows the CloudFormation modal
        await expect(page.getByTestId('postInstallCloudFormationModal')).toBeVisible({
          timeout: 60000,
        });

        // Close the modal by clicking "Launch CloudFormation later"
        await page.getByTestId('confirmCloudFormationModalCancelButton').click();
        await expect(page.getByTestId('postInstallCloudFormationModal')).toBeHidden();

        // Click on the integration to navigate to edit page
        await page.getByText(integrationName).click();

        // Wait for navigation to edit page and extract policy ID from URL
        await page.waitForURL(/edit-integration/);
        const policyIdMatch = page.url().match(/edit-integration\/([^/?]+)/);
        expect(policyIdMatch).toBeTruthy();
        const policyId = policyIdMatch![1];

        // Validate NO cloud connector attributes
        const policy = await apiServices.cloudConnectorApi.getPackagePolicy(policyId);
        expect(policy.supports_cloud_connector).toBeFalsy();
        expect(policy.cloud_connector_id).toBeFalsy();

        // Validate stream var does NOT include supports_cloud_connector
        const streamVars = policy.inputs[0].streams[0].vars;
        expect(streamVars.supports_cloud_connector).toBeUndefined();
      }
    );

    spaceTest(
      'Azure CSPM - Switch FROM cloud connectors to agent-based',
      async ({ pageObjects, apiServices, page }) => {
        const integrationName = `azure-cspm-agent-${Date.now()}`;

        await pageObjects.cspmIntegrationPage.navigate();
        await pageObjects.cspmIntegrationPage.selectProvider('azure');
        await pageObjects.cspmIntegrationPage.selectAccountType('azure', 'organization');
        await pageObjects.cspmIntegrationPage.selectSetupTechnology('agentless');

        // Cloud connectors is selected by default
        // Switch setup technology to agent-based
        await pageObjects.cspmIntegrationPage.selectSetupTechnology('agent-based');

        await pageObjects.cspmIntegrationPage.fillIntegrationName(integrationName);

        // In test environment with mock agentless API, error toast may appear about
        // missing agent policy. Dismiss it if present before saving.
        const azureErrorToast = page.getByTestId('globalToastList');
        // eslint-disable-next-line playwright/no-conditional-in-test
        if (await azureErrorToast.isVisible({ timeout: 1000 }).catch(() => false)) {
          await page.getByTestId('toastCloseButton').click();
          await azureErrorToast.waitFor({ state: 'hidden' });
        }

        await pageObjects.cspmIntegrationPage.saveIntegration();

        // Agent-based for Azure organization shows the ARM Template modal
        await expect(page.getByTestId('postInstallAzureArmTemplateModal')).toBeVisible({
          timeout: 60000,
        });

        // Close the modal by clicking "Add ARM Template later"
        await page.getByTestId('confirmAzureArmTemplateModalCancelButton').click();
        await expect(page.getByTestId('postInstallAzureArmTemplateModal')).toBeHidden();

        // Click on the integration to navigate to edit page
        await page.getByText(integrationName).click();

        // Wait for navigation to edit page and extract policy ID from URL
        await page.waitForURL(/edit-integration/);
        const policyIdMatch = page.url().match(/edit-integration\/([^/?]+)/);
        expect(policyIdMatch).toBeTruthy();
        const policyId = policyIdMatch![1];

        // Validate NO cloud connector attributes
        const policy = await apiServices.cloudConnectorApi.getPackagePolicy(policyId);
        expect(policy.supports_cloud_connector).toBeFalsy();
        expect(policy.cloud_connector_id).toBeFalsy();

        // Validate stream var does NOT include supports_cloud_connector
        const streamVars = policy.inputs[0].streams[0].vars;
        expect(streamVars.supports_cloud_connector).toBeUndefined();
      }
    );
  }
);
