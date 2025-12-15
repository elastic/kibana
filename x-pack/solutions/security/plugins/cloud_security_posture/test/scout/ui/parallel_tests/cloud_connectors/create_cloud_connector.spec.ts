/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, spaceTest } from '@kbn/scout-security';
import type { CreateAgentlessPolicyRequest } from '@kbn/fleet-plugin/common/types/rest_spec/agentless_policy';

// Use the Fleet plugin's typed request body
type AgentlessPolicyRequestBody = CreateAgentlessPolicyRequest['body'];

/**
 * Creates a mock agentless policy response for testing.
 * The response format should match what the UI expects after successful creation.
 */
function createMockAgentlessPolicyResponse(requestBody: AgentlessPolicyRequestBody) {
  const mockPolicyId = `mock-policy-${Date.now()}`;
  const mockAgentPolicyId = `mock-agent-policy-${Date.now()}`;
  const mockConnectorId = `mock-connector-${Date.now()}`;

  // Convert legacy inputs format to array format for the response
  const inputsArray = Object.entries(requestBody.inputs ?? {}).map(([type, input]) => ({
    type,
    enabled: input.enabled,
    streams: Object.entries(input.streams ?? {}).map(([streamKey, stream]) => ({
      enabled: stream.enabled,
      data_stream: { type: 'logs', dataset: streamKey },
      vars: stream.vars,
    })),
  }));

  return {
    item: {
      id: mockPolicyId,
      name: requestBody.name,
      namespace: requestBody.namespace || 'default',
      package: requestBody.package,
      inputs: inputsArray,
      policy_id: mockAgentPolicyId,
      policy_ids: [mockAgentPolicyId],
      supports_agentless: true,
      supports_cloud_connector: !!requestBody.cloud_connector?.enabled,
      cloud_connector_id: requestBody.cloud_connector?.enabled ? mockConnectorId : undefined,
    },
  };
}

// Stream and input key constants
const FINDINGS_STREAM_KEY = 'cloud_security_posture.findings';
const AWS_INPUT_KEY_PATTERN = 'cis_aws';
const AZURE_INPUT_KEY_PATTERN = 'cis_azure';

// Credential type constants
const CLOUD_CONNECTORS_CREDENTIAL_TYPE = 'cloud_connectors';

// AWS credential var keys
const AWS_CREDENTIALS_EXTERNAL_ID_KEY = 'aws.credentials.external_id';
const AWS_CREDENTIALS_TYPE_KEY = 'aws.credentials.type';

// Azure credential var keys
const AZURE_CREDENTIALS_TENANT_ID_KEY = 'azure.credentials.tenant_id';
const AZURE_CREDENTIALS_CLIENT_ID_KEY = 'azure.credentials.client_id';
const AZURE_CREDENTIALS_CONNECTOR_ID_KEY = 'azure_credentials_cloud_connector_id';
const AZURE_CREDENTIALS_TYPE_KEY = 'azure.credentials.type';

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
    async ({ pageObjects, page }) => {
      const integrationName = `aws-cspm-cc-${Date.now()}`;
      const roleArn = 'arn:aws:iam::123456789012:role/TestRole';
      const externalId = 'test-external-id';
      const connectorName = 'test-connector-name';

      let capturedRequestBody: AgentlessPolicyRequestBody | null = null;

      // Set up route interception for agentless policies API
      // Only capture data in handler - assertions moved to main test body
      await page.route(/\/api\/fleet\/agentless_policies/, async (route, request) => {
        if (request.method() === 'POST') {
          capturedRequestBody = request.postDataJSON() as AgentlessPolicyRequestBody;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(createMockAgentlessPolicyResponse(capturedRequestBody)),
          });
        } else {
          await route.continue();
        }
      });

      // Navigate and configure integration
      await pageObjects.cspmIntegrationPage.navigate();
      await pageObjects.cspmIntegrationPage.selectProvider('aws');
      await pageObjects.cspmIntegrationPage.selectAccountType('aws', 'organization');
      await pageObjects.cspmIntegrationPage.selectSetupTechnology('agentless');
      // Cloud connectors is selected by default when agentless + cloud connectors are enabled
      await pageObjects.cspmIntegrationPage.fillCloudConnectorName(connectorName);
      await pageObjects.cspmIntegrationPage.fillCloudConnectorRoleArn(roleArn);
      // External ID is optional - fill if field is present
      await pageObjects.cspmIntegrationPage.fillAwsCloudConnectorExternalId(externalId);
      await pageObjects.cspmIntegrationPage.fillIntegrationName(integrationName);
      await pageObjects.cspmIntegrationPage.saveIntegration();

      // Wait for the request to be captured by polling
      await expect
        .poll(() => capturedRequestBody, {
          message: 'Waiting for agentless policy request to be captured',
          timeout: 30000,
        })
        .not.toBeNull();

      // Verify the request was captured - this is the main test: validating request shape
      expect(capturedRequestBody).not.toBeNull();

      // Validate package is cloud_security_posture
      expect(capturedRequestBody!.name).toBe(integrationName);

      // Validate AWS-specific input is enabled in the captured request (legacy format uses object keys)
      const awsInputKey = Object.keys(capturedRequestBody!.inputs ?? {}).find((key) =>
        key.includes(AWS_INPUT_KEY_PATTERN)
      );
      expect(awsInputKey).toBeDefined();
      expect(capturedRequestBody!.inputs![awsInputKey!].enabled).toBe(true);

      // Validate AWS cloud connector credentials in the captured request
      const awsInput = capturedRequestBody!.inputs![awsInputKey!];
      const awsFindingsStream = awsInput.streams![FINDINGS_STREAM_KEY];
      expect(awsFindingsStream).toBeDefined();
      expect(awsFindingsStream.vars).toBeDefined();

      // Validate credential vars
      expect(awsFindingsStream.vars!.role_arn).toBe(roleArn);
      expect(awsFindingsStream.vars![AWS_CREDENTIALS_EXTERNAL_ID_KEY]).toBe(externalId);
      expect(awsFindingsStream.vars![AWS_CREDENTIALS_TYPE_KEY]).toBe(
        CLOUD_CONNECTORS_CREDENTIAL_TYPE
      );

      // Validate cloud connector fields in the request
      expect(capturedRequestBody!.cloud_connector).toBeDefined();
      expect(capturedRequestBody!.cloud_connector!.enabled).toBe(true);
      expect(capturedRequestBody!.cloud_connector!.name).toBe(connectorName);
    }
  );

  spaceTest(
    'Azure CSPM - Create organization account with new cloud connector',
    async ({ pageObjects, page }) => {
      const integrationName = `azure-cspm-cc-${Date.now()}`;
      const tenantId = 'test-tenant-id';
      const clientId = 'test-client-id';
      const connectorName = 'test-connector-name';
      const credentialsId = 'test-credentials-id';
      let capturedRequestBody: AgentlessPolicyRequestBody | null = null;

      // Set up route interception for agentless policies API
      // Only capture data in handler - assertions moved to main test body
      await page.route(/\/api\/fleet\/agentless_policies/, async (route, request) => {
        if (request.method() === 'POST') {
          capturedRequestBody = request.postDataJSON() as AgentlessPolicyRequestBody;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(createMockAgentlessPolicyResponse(capturedRequestBody)),
          });
        } else {
          await route.continue();
        }
      });

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
      await pageObjects.cspmIntegrationPage.fillIntegrationName(integrationName);
      await pageObjects.cspmIntegrationPage.saveIntegration();

      // Wait for the request to be captured by polling
      await expect
        .poll(() => capturedRequestBody, {
          message: 'Waiting for agentless policy request to be captured',
          timeout: 30000,
        })
        .not.toBeNull();

      // Verify the request was captured - this is the main test: validating request shape
      expect(capturedRequestBody).not.toBeNull();

      expect(capturedRequestBody!.name).toBe(integrationName);

      // Validate Azure-specific input is enabled in the captured request (legacy format uses object keys)
      const azureInputKey = Object.keys(capturedRequestBody!.inputs ?? {}).find((key) =>
        key.includes(AZURE_INPUT_KEY_PATTERN)
      );
      expect(azureInputKey).toBeDefined();
      expect(capturedRequestBody!.inputs![azureInputKey!].enabled).toBe(true);

      // Validate Azure cloud connector credentials in the captured request
      const azureInput = capturedRequestBody!.inputs![azureInputKey!];
      const azureFindingsStream = azureInput.streams![FINDINGS_STREAM_KEY];
      expect(azureFindingsStream).toBeDefined();
      expect(azureFindingsStream.vars).toBeDefined();

      // Validate credential vars
      expect(azureFindingsStream.vars![AZURE_CREDENTIALS_TENANT_ID_KEY]).toBe(tenantId);
      expect(azureFindingsStream.vars![AZURE_CREDENTIALS_CLIENT_ID_KEY]).toBe(clientId);
      expect(azureFindingsStream.vars).toHaveProperty(
        AZURE_CREDENTIALS_CONNECTOR_ID_KEY,
        credentialsId
      );
      expect(azureFindingsStream.vars![AZURE_CREDENTIALS_TYPE_KEY]).toBe(
        CLOUD_CONNECTORS_CREDENTIAL_TYPE
      );

      // Validate cloud connector fields in the request
      expect(capturedRequestBody!.cloud_connector).toBeDefined();
      expect(capturedRequestBody!.cloud_connector!.enabled).toBe(true);
      expect(capturedRequestBody!.cloud_connector!.name).toBe(connectorName);
    }
  );
});
