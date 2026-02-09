/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateAgentlessPolicyRequest } from '@kbn/fleet-plugin/common/types/rest_spec/agentless_policy';
import { spaceTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { mockAgentlessPoliciesWithCapture, mockPackagePoliciesEmpty } from '../../fixtures/mocks';

// Use the Fleet plugin's typed request body
type AgentlessPolicyRequestBody = CreateAgentlessPolicyRequest['body'];

// Stream and input key constants
const FINDINGS_STREAM_KEY = 'cloud_security_posture.findings';
const AWS_INPUT_KEY_PATTERN = 'cis_aws';
const AZURE_INPUT_KEY_PATTERN = 'cis_azure';

// Credential type constants
const CLOUD_CONNECTORS_CREDENTIAL_TYPE = 'cloud_connectors';

// AWS credential var keys
const AWS_CREDENTIALS_TYPE_KEY = 'aws.credentials.type';
const AWS_CREDENTIALS_EXTERNAL_ID_KEY = 'aws.credentials.external_id';

// Azure credential var keys
const AZURE_CREDENTIALS_TYPE_KEY = 'azure.credentials.type';
const AZURE_CREDENTIALS_TENANT_ID_KEY = 'azure.credentials.tenant_id';
const AZURE_CREDENTIALS_CLIENT_ID_KEY = 'azure.credentials.client_id';
const AZURE_CREDENTIALS_CONNECTOR_ID_KEY = 'azure_credentials_cloud_connector_id';

/**
 * Creates a mock cloud connector for testing the "reuse existing connector" flow.
 */
function createMockCloudConnector(
  id: string,
  name: string,
  cloudProvider: 'aws' | 'azure'
): Record<string, unknown> {
  const baseConnector = {
    id,
    name,
    cloudProvider,
    accountType: 'organization-account',
    packagePolicyCount: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    namespace: 'default',
  };

  if (cloudProvider === 'aws') {
    return {
      ...baseConnector,
      vars: {
        role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/ExistingRole' },
        external_id: {
          type: 'password',
          value: { isSecretRef: true, id: 'secret-ref-id' },
          frozen: true,
        },
      },
    };
  } else {
    return {
      ...baseConnector,
      vars: {
        tenant_id: {
          type: 'password',
          value: { isSecretRef: true, id: 'tenant-secret-ref' },
          frozen: true,
        },
        client_id: {
          type: 'password',
          value: { isSecretRef: true, id: 'client-secret-ref' },
          frozen: true,
        },
        azure_credentials_cloud_connector_id: { type: 'text', value: 'existing-azure-cred-id' },
      },
    };
  }
}

/**
 * These tests validate request shape for REUSING existing cloud connectors.
 * The tests intercept the cloud connectors API to return mock existing connectors,
 * then verify the request shape includes cloud_connector_id instead of name.
 */
spaceTest.describe(
  'Cloud Connectors - Reuse Existing Connector',
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
      'AWS CSPM - Request includes cloud_connector_id when reusing existing connector',
      async ({ pageObjects, page }) => {
        const integrationName = `aws-cspm-reuse-${Date.now()}`;
        const existingConnectorId = 'existing-aws-connector-id';
        const existingConnectorName = 'My Existing AWS Connector';
        let capturedRequestBody: AgentlessPolicyRequestBody | null = null;

        // Mock the package policy list API (GET request needed for form initialization)
        await mockPackagePoliciesEmpty(page);

        // Intercept cloud connectors API to return mock existing connectors
        await page.route(/\/api\/fleet\/cloud_connectors/, async (route, request) => {
          if (request.method() === 'GET') {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                items: [
                  createMockCloudConnector(existingConnectorId, existingConnectorName, 'aws'),
                ],
              }),
            });
          } else {
            await route.continue();
          }
        });

        // Intercept agentless policies API to capture the request
        await mockAgentlessPoliciesWithCapture(
          page,
          (body) => {
            capturedRequestBody = body;
          },
          existingConnectorId
        );

        await pageObjects.cspmIntegrationPage.navigate();
        await pageObjects.cspmIntegrationPage.selectProvider('aws');
        await pageObjects.cspmIntegrationPage.selectAccountType('aws', 'organization');
        await pageObjects.cspmIntegrationPage.selectSetupTechnology('agentless');

        // Wait for form to be ready before selecting existing connector
        const saveButton = page.getByTestId('createPackagePolicySaveButton');
        await saveButton.waitFor({ state: 'visible' });

        // Select the existing connector (UI should show "Existing Connections" tab with mock data)
        await pageObjects.cspmIntegrationPage.selectExistingCloudConnector(
          'aws',
          existingConnectorName
        );

        await pageObjects.cspmIntegrationPage.fillIntegrationName(integrationName);

        // Wait for the save button to be enabled before clicking
        await expect(saveButton).toBeEnabled({ timeout: 10000 });

        await pageObjects.cspmIntegrationPage.saveIntegration();

        // Wait for the request to be captured by polling
        await expect
          .poll(() => capturedRequestBody, {
            message: 'Waiting for agentless policy request to be captured',
            timeout: 30000,
          })
          .not.toBeNull();

        // Validate the request was captured with correct shape
        expect(capturedRequestBody).not.toBeNull();
        expect(capturedRequestBody!.name).toBe(integrationName);

        // Validate the AWS input and stream vars
        const awsInputKey = Object.keys(capturedRequestBody!.inputs ?? {}).find((key) =>
          key.includes(AWS_INPUT_KEY_PATTERN)
        );
        expect(awsInputKey).toBeDefined();

        const awsInput = capturedRequestBody!.inputs![awsInputKey!];
        const findingsStream = awsInput.streams![FINDINGS_STREAM_KEY];
        expect(findingsStream).toBeDefined();
        expect(findingsStream.vars).toBeDefined();
        expect(findingsStream.vars![AWS_CREDENTIALS_TYPE_KEY]).toBe(
          CLOUD_CONNECTORS_CREDENTIAL_TYPE
        );
        expect(findingsStream.vars!.role_arn).toBe('arn:aws:iam::123456789012:role/ExistingRole');
        // External ID is a secret reference object when reusing existing connector
        expect(findingsStream.vars![AWS_CREDENTIALS_EXTERNAL_ID_KEY]).toStrictEqual({
          isSecretRef: true,
          id: 'secret-ref-id',
        });

        // Key assertion: When REUSING an existing connector:
        // - cloud_connector.cloud_connector_id should be the existing connector's ID
        // - cloud_connector.name should NOT be present (we're not creating a new one)
        expect(capturedRequestBody!.cloud_connector).toBeDefined();
        expect(capturedRequestBody!.cloud_connector!.enabled).toBe(true);
        expect(capturedRequestBody!.cloud_connector!.cloud_connector_id).toBe(existingConnectorId);
        expect(capturedRequestBody!.cloud_connector!.name).toBeUndefined();
      }
    );

    spaceTest(
      'Azure CSPM - Request includes cloud_connector_id when reusing existing connector',
      async ({ pageObjects, page }) => {
        const integrationName = `azure-cspm-reuse-${Date.now()}`;
        const existingConnectorId = 'existing-azure-connector-id';
        const existingConnectorName = 'My Existing Azure Connector';
        let capturedRequestBody: AgentlessPolicyRequestBody | null = null;

        // Mock the package policy list API (GET request needed for form initialization)
        await mockPackagePoliciesEmpty(page);

        // Intercept cloud connectors API to return mock existing connectors
        await page.route(/\/api\/fleet\/cloud_connectors/, async (route, request) => {
          if (request.method() === 'GET') {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                items: [
                  createMockCloudConnector(existingConnectorId, existingConnectorName, 'azure'),
                ],
              }),
            });
          } else {
            await route.continue();
          }
        });

        // Intercept agentless policies API to capture the request
        await mockAgentlessPoliciesWithCapture(
          page,
          (body) => {
            capturedRequestBody = body;
          },
          existingConnectorId
        );

        await pageObjects.cspmIntegrationPage.navigate();
        await pageObjects.cspmIntegrationPage.selectProvider('azure');
        await pageObjects.cspmIntegrationPage.selectAccountType('azure', 'organization');
        await pageObjects.cspmIntegrationPage.selectSetupTechnology('agentless');

        // Wait for form to be ready before selecting existing connector
        const saveButton = page.getByTestId('createPackagePolicySaveButton');
        await saveButton.waitFor({ state: 'visible' });

        // Select the existing connector (UI should show "Existing Connections" tab with mock data)
        await pageObjects.cspmIntegrationPage.selectExistingCloudConnector(
          'azure',
          existingConnectorName
        );

        await pageObjects.cspmIntegrationPage.fillIntegrationName(integrationName);

        // Wait for the save button to be enabled before clicking
        await expect(saveButton).toBeEnabled({ timeout: 10000 });

        await pageObjects.cspmIntegrationPage.saveIntegration();

        // Wait for the request to be captured by polling
        await expect
          .poll(() => capturedRequestBody, {
            message: 'Waiting for agentless policy request to be captured',
            timeout: 30000,
          })
          .not.toBeNull();

        // Validate the request was captured with correct shape
        expect(capturedRequestBody).not.toBeNull();
        expect(capturedRequestBody!.name).toBe(integrationName);

        // Validate the Azure input and stream vars
        const azureInputKey = Object.keys(capturedRequestBody!.inputs ?? {}).find((key) =>
          key.includes(AZURE_INPUT_KEY_PATTERN)
        );
        expect(azureInputKey).toBeDefined();

        const azureInput = capturedRequestBody!.inputs![azureInputKey!];
        const findingsStream = azureInput.streams![FINDINGS_STREAM_KEY];
        expect(findingsStream).toBeDefined();
        expect(findingsStream.vars).toBeDefined();
        expect(findingsStream.vars![AZURE_CREDENTIALS_TYPE_KEY]).toBe(
          CLOUD_CONNECTORS_CREDENTIAL_TYPE
        );

        // Tenant ID and Client ID are secret references when reusing existing connector
        expect(findingsStream.vars![AZURE_CREDENTIALS_TENANT_ID_KEY]).toStrictEqual({
          isSecretRef: true,
          id: 'tenant-secret-ref',
        });
        expect(findingsStream.vars![AZURE_CREDENTIALS_CLIENT_ID_KEY]).toStrictEqual({
          isSecretRef: true,
          id: 'client-secret-ref',
        });
        expect(findingsStream.vars).toHaveProperty(
          AZURE_CREDENTIALS_CONNECTOR_ID_KEY,
          'existing-azure-cred-id'
        );

        // Key assertion: When REUSING an existing connector:
        // - cloud_connector.cloud_connector_id should be the existing connector's ID
        // - cloud_connector.name should NOT be present (we're not creating a new one)
        expect(capturedRequestBody!.cloud_connector).toBeDefined();
        expect(capturedRequestBody!.cloud_connector!.enabled).toBe(true);
        expect(capturedRequestBody!.cloud_connector!.cloud_connector_id).toBe(existingConnectorId);
        expect(capturedRequestBody!.cloud_connector!.name).toBeUndefined();
      }
    );
  }
);
